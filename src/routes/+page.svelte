<!-- TODO
1. Add results page
3. Prevent double trade
-->

<script>
	import { addBid, addAsk, cancelOrder, buy, sell, cancelOrderAtPrice } from '$lib/orderbooks';
	import { orderbooks, signalRConnection } from '$lib/orderbooks';
	import { get } from 'svelte/store';
	import { getAllTradesByUser, groupTradesById, tradesStore } from '$lib/trades';
	import { onDestroy, onMount } from 'svelte';

	/**
	 * @type {string[]}
	 */
	let transactions = [];

	/**
	 * @type {HTMLInputElement}
	 */
	let inputElement;

	/**
	 * @type {import('$lib/orderbooks').OrderEntry[]}
	 */
	let allPrices = [];

	let showModal = false;

	orderbooks.subscribe((orderbooks) => {
		allPrices = [
			...new Set([...orderbooks.bids, ...orderbooks.asks].map((item) => item.price))
		].sort((a, b) => b - a);
	});

	/**
	 * @type {{ [user: string]: number }}
	 */
	let exposureByUser = {};

	tradesStore.subscribe((trades) => {
		// User bought/sold at price
		const grouped_trades = groupTradesById(trades);
		const tradesByUser = getAllTradesByUser();

		transactions = [];

		for (let id in grouped_trades) {
			const trades = grouped_trades[id];
			const buy_trade = trades['buy'];
			const sell_trade = trades['sell'];
			if (buy_trade && sell_trade) {
				if (buy_trade.user === sell_trade.user) {
					continue;
				}
				if (buy_trade.instigator === true) {
					transactions.push(
						`${buy_trade.user} bought from ${sell_trade.user} at ${buy_trade.price}`
					);
				} else {
					transactions.push(`${sell_trade.user} sold to ${buy_trade.user} at ${buy_trade.price}`);
				}
			}
		}

		for (let user in tradesByUser) {
			let trades = tradesByUser[user];
			let exposure = 0;

			for (let trade of trades) {
				if (trade.side === 'buy') {
					exposure += 1;
				} else if (trade.side === 'sell') {
					exposure -= 1;
				}
			}

			exposureByUser[user] = exposure;
		}
	});

	/**
	 * @param {import('$lib/orderbooks').OrderEntry} price
	 * @param {string} type
	 */
	function getOrdersForPrice(price, type) {
		let current_orderbooks = get(orderbooks);
		return (type === 'bid' ? current_orderbooks.bids : current_orderbooks.asks).filter(
			(/** @type {{ price: import("$lib/orderbooks").OrderEntry; }} */ order) =>
				order.price === price
		);
	}

	let input = '';

	function generateId() {
		return Math.random().toString(36).substr(2, 9);
	}

	function getTimestamp() {
		return new Date().getTime();
	}

	function addOrder() {
		// BUY USERNAME
		// SELL USERNAME
		// BID PRICE USERNAME
		// ASK PRICE USERNAME

		input = input.toUpperCase();
		let inputArray = input.split(' ');

		if (inputArray.length === 1) {
			// b100zac, a100zac, mbzac, mszac,10@90zac, c100zac
			const user_input = inputArray[0];
			if (user_input.startsWith('B')) {
				const [price, name] = splitInput(user_input.slice(1));
				if (price && name) {
					addBid({
						id: generateId(),
						price: Number(price),
						user: name,
						timestamp: getTimestamp()
					});
				} else {
					console.error('Invalid input');
				}
			} else if (user_input.startsWith('A')) {
				const [price, name] = splitInput(user_input.slice(1));
				if (price && name) {
					addAsk({
						id: generateId(),
						price: Number(price),
						user: name,
						timestamp: getTimestamp()
					});
				} else {
					console.error('Invalid input');
				}
			} else if (user_input.startsWith('MB')) {
				const name = user_input.slice(2);
				buy(name);
			} else if (user_input.startsWith('MS')) {
				const name = user_input.slice(2);
				sell(name);
			} else if (user_input.startsWith('C')) {
				const [price, name] = splitInput(user_input.slice(1));
				if (name && price) {
					cancelOrderAtPrice(name, Number(price));
				} else {
					console.error('Invalid input');
				}
			} else if (user_input.includes('@')) {
				const [bid_price, ask_price_and_name] = user_input.split('@');
				const [ask_price, name] = splitInput(ask_price_and_name);
				if (bid_price && ask_price && name) {
					if (isNaN(Number(bid_price)) || isNaN(Number(ask_price))) {
						console.error('Invalid price (NaN)');
						input = '';
						return;
					}

					if (Number(bid_price) >= Number(ask_price)) {
						console.error('Bid price must be lower than ask price');
						input = '';
						return;
					}

					const bid = {
						id: generateId(),
						price: Number(bid_price),
						user: name,
						timestamp: getTimestamp()
					};

					const ask = {
						id: generateId(),
						price: Number(ask_price),
						user: name,
						timestamp: getTimestamp()
					};

					addBid(bid);
					addAsk(ask);
				}
			} else {
				console.error('Invalid input');
			}
		} else if (inputArray.length === 3) {
			const trade_type = inputArray[0];
			const username = inputArray[2];
			const price = Number(inputArray[1]);

			if (trade_type.startsWith('M')) {
				if (inputArray[1].startsWith('B')) {
					buy(username);
				} else if (inputArray[1].startsWith('S')) {
					sell(username);
				} else {
					console.error('Error matching input');
				}
				input = '';
				return;
			}

			if (isNaN(price)) {
				console.error('Invalid price (NaN)');
				input = '';
				return;
			}

			// type is orderentry
			/** @type {import('$lib/orderbooks').OrderEntry} */
			const entry = {
				id: generateId(),
				price,
				user: username,
				timestamp: getTimestamp()
			};

			if (trade_type.startsWith('B')) {
				addBid(entry);
			} else if (trade_type.startsWith('A')) {
				addAsk(entry);
			} else if (trade_type.startsWith('C')) {
				cancelOrderAtPrice(username, price);
			} else {
				console.error('Error matching input');
			}
		} else if (inputArray.length === 4) {
			// expecting PRICE @ PRICE NAME
			const bid_price = Number(inputArray[0]);
			const ask_price = Number(inputArray[2]);
			const username = inputArray[3];

			if (isNaN(bid_price) || isNaN(ask_price)) {
				console.error('Invalid price (NaN)');
				input = '';
				return;
			}

			if (bid_price >= ask_price) {
				console.error('Bid price must be lower than ask price');
				input = '';
				return;
			}

			const bid = {
				id: generateId(),
				price: bid_price,
				user: username,
				timestamp: getTimestamp()
			};

			const ask = {
				id: generateId(),
				price: ask_price,
				user: username,
				timestamp: getTimestamp()
			};

			addBid(bid);
			addAsk(ask);
		} else {
			console.error('Invalid input length');
		}

		input = '';
	}

	onMount(() => {
		// @ts-ignore
		const handleKeydown = (event) => {
			if (event.target !== inputElement) {
				// Avoid refocusing if the input is already focused
				inputElement.focus();
			}
			// if key is escape, clear input
			if (event.key === 'Escape') {
				input = '';
			}
		};

		document.addEventListener('keydown', handleKeydown);

		onDestroy(() => {
			document.removeEventListener('keydown', handleKeydown);
		});
	});

	/**
	 * @param {string} input
	 */
	function splitInput(input) {
		// This regex looks for a sequence of digits followed by a sequence of non-digits.
		const match = input.match(/^(\d+)([^\d]+)/);
		if (match) {
			return [match[1], match[2]];
		}
		return [null, null];
	}
</script>

<main class="flex flex-row h-screen">
	<section class="w-3/4">
		<h1
			class="text-3xl font-bold text-center py-5 text-white [text-shadow:_0_2px_2px_rgb(0_0_0_/_80%)]"
			style="background-color: #00B050"
		>
			QFIN ORDERBOOK SIMULATOR
		</h1>
		<table class="min-w-full divide-y divide-gray-200 text-center border-r border-b">
			<thead class="bg-gray-50">
				<tr>
					<th
						scope="col"
						class="w-1/3 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
					>
						Bid
					</th>
					<th
						scope="col"
						class="w-1/3 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
					>
						Price
					</th>
					<th
						scope="col"
						class="w-1/3 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
					>
						Ask
					</th>
				</tr>
			</thead>
			{#if allPrices.length === 0}
				<tbody>
					<tr>
						<td colspan="3" class="py-3 text-gray-500">
							Place orders by typing anywhere on the screen
						</td>
					</tr>
				</tbody>
			{:else}
				<tbody class="bg-white divide-y divide-gray-200">
					{#each allPrices as price}
						<tr>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm text-gray-900">
									{#each getOrdersForPrice(price, 'bid') as bid, index}
										<button
											class="cursor-pointer hover:underline"
											on:click={() => cancelOrder(bid.id)}>{bid.user}</button
										>{#if index < getOrdersForPrice(price, 'bid').length - 1}{@html ', '}{/if}
									{/each}
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm text-gray-900">${price}</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm text-gray-900">
									{#each getOrdersForPrice(price, 'ask') as ask, index}
										<button
											class="cursor-pointer hover:underline"
											on:click={() => cancelOrder(ask.id)}>{ask.user}</button
										>{#if index < getOrdersForPrice(price, 'ask').length - 1}{@html ', '}{/if}
									{/each}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			{/if}
		</table>
	</section>
	<section class="w-1/4 border-l">
		<h1
			class="text-3xl font-bold text-center py-5 text-white [text-shadow:_0_2px_2px_rgb(0_0_0_/_80%)]"
			style="background-color: #00B050"
		>
			Transaction Log
		</h1>
		<!-- transctions listed -->
		{#each transactions as transaction}
			<div class="p-2 border-b uppercase text-sm">
				{transaction}
			</div>
		{/each}
	</section>
</main>
<div class="absolute top-0 left-0 p-5 flex flex-row gap-2">
	<button
		class="rounded p-2 bg-blue-500 text-white font-bold"
		on:click={() => (window.location.href = '/results')}
	>
		View Results
	</button>
	<button
		class="rounded p-2 bg-yellow-500 text-white font-bold"
		on:click={() => (showModal = true)}
	>
		Help
	</button>
</div>

<footer class="fixed bottom-10 left-0 flex flex-row items-end justify-center w-3/4">
	<form class="p-4 flex flex-col" on:submit|preventDefault={() => addOrder()}>
		<!-- if input length is 0, hide the input -->
		<input
			bind:this={inputElement}
			type="text"
			class="shadow bg-gray-800 bg-opacity-50 rounded p-5 text-3xl font-bold text-center text-white leading-tight focus:outline-none focus:shadow-outline\
            {input.length === 0 ? 'opacity-0 cursor-default' : 'opacity-100'}"
			bind:value={input}
		/>
	</form>
</footer>

<footer class="fixed bottom-0 right-0 flex flex-col justify-start w-1/4">
	<h1
		class="text-3xl font-bold text-center py-2 text-white [text-shadow:_0_2px_2px_rgb(0_0_0_/_80%)]"
		style="background-color: #00B050"
	>
		Exposure
	</h1>
	<div class="divide-y divide-gray-200 text-center border-r border-b">
		<div class="flex bg-gray-50">
			<div class="w-1/2 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
				Name
			</div>
			<div class="w-1/2 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
				Exposure
			</div>
		</div>
		{#if Object.keys(exposureByUser).length === 0}
			<div class="py-3 px-2 text-center w-full text-gray-500 border-2">
				No outstanding exposure
			</div>
		{:else}
			<!-- sorts by exposure -->
			{#each Object.entries(exposureByUser).sort((a, b) => b[1] - a[1]) as [user, exposure]}
				{#if exposure !== 0}
					<div class="flex bg-white">
						<div class="w-1/2 px-6 py-2">
							<p class="text-sm text-gray-900">{user}</p>
						</div>
						<div class="w-1/2 px-6 py-2">
							<p class="text-sm text-gray-900">{exposure}</p>
						</div>
					</div>
				{/if}
			{/each}
		{/if}
	</div>
</footer>

{#if showModal}
	<!-- im not that good at svelte yet -->
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black bg-opacity-50">
		<div class="py-10 px-20 space-y-5 bg-white rounded shadow-md text-sm">
			<div class="flex justify-between">
				<h1 class="font-bold text-gray-700 text-3xl">How to Place Orders</h1>
				<button class="float-right underline" on:click={() => (showModal = false)}>Close</button>
			</div>
			<div class="flex flex-col justify-start">
				<div class="flex justify-between">
					<p class="text-gray-600">BID PRICE NAME</p>
					<p class="text-gray-900">BID 100 ZAC</p>
				</div>
				<p class="text-xs text-gray-500 pl-4">
					Place a bid order for ZAC at your specified price. <br />
					"BID 100 ZAC" will place a bid order for ZAC at 100. <br />
					<strong>Shorthand: b100Zac</strong>
				</p>
			</div>

			<div class="flex flex-col justify-start">
				<div class="flex justify-between">
					<p class="text-gray-600">ASK PRICE NAME</p>
					<p class="text-gray-900">ASK 100 ZAC</p>
				</div>
				<p class="text-xs text-gray-500 pl-4">
					Place an ask (sell) order for ZAC at your desired price. <br />
					"ASK 100 ZAC" will place an ask order for ZAC at 100. <br />
					<strong>Shorthand: a100Zac</strong>
				</p>
			</div>

			<div class="flex flex-col justify-start">
				<div class="flex justify-between">
					<p class="text-gray-600">MARKET BUY NAME</p>
					<p class="text-gray-900">MARKET BUY ZAC</p>
				</div>
				<p class="text-xs text-gray-500 pl-4">
					Immediately buys the lowest ask order for ZAC. <br />
					"BUY ZAC" will perform a market buy for ZAC at the lowest ask price. <br />
					<strong>Shorthand: mbZac</strong>
				</p>
			</div>

			<div class="flex flex-col justify-start">
				<div class="flex justify-between">
					<p class="text-gray-600">MARKET SELL NAME</p>
					<p class="text-gray-900">MARKET SELL ZAC</p>
				</div>
				<p class="text-xs text-gray-500 pl-4">
					Immediately sells to the highest bid order for ZAC. <br />
					"SELL ZAC" will perform a market sell for ZAC at the highest bid price.<br />
					<strong>Shorthand: msZac</strong>
				</p>
			</div>

			<div class="flex flex-col justify-start">
				<div class="flex justify-between">
					<p class="text-gray-600">PRICE @ PRICE NAME</p>
					<p class="text-gray-900">10 @ 90 ZAC</p>
				</div>
				<p class="text-xs text-gray-500 pl-4">
					Places a bid order and an ask order for ZAC. <br />
					"10 @ 90 ZAC" will place a bid order for ZAC at 10 and an ask order for ZAC at 90.<br />
					<strong>Shorthand: 10@90Zac</strong>
				</p>
			</div>

			<div class="flex flex-col justify-start">
				<div class="flex justify-between">
					<p class="text-gray-600">CANCEL NAME PRICE</p>
					<p class="text-gray-900">CANCEL ZAC 100</p>
				</div>
				<p class="text-xs text-gray-500 pl-4">
					Simply click on the name of the order you wish to cancel. <br />
					<strong>Shorthand: cZac100</strong>
				</p>
			</div>
		</div>
	</div>
{/if}
