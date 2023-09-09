<script>
	import { clearStorage } from '$lib/orderbooks';
	import { getAllTradesByUser } from '$lib/trades';

	let tradesByUser = getAllTradesByUser();
	/**
	 * @type {{ [user: string]: number }}
	 */
	let pnlByUser = {};
	/**
	 * @type {{ [user: string]: number }}
	 */
	let exposureByUser = {};

	let actual_price = NaN;

	let input = '';

	// Loop through each user's trades to calculate P&L and exposure
	for (let user in tradesByUser) {
		let trades = tradesByUser[user];
		let pnl = 0;
		let exposure = 0;

		for (let trade of trades) {
			if (trade.side === 'buy') {
				pnl -= trade.price; // Cost for buying is negative
				exposure += 1;
			} else if (trade.side === 'sell') {
				pnl += trade.price; // Gain from selling is positive
				exposure -= 1;
			}
		}

		pnlByUser[user] = pnl;
		exposureByUser[user] = exposure;
	}

	// Overall is an pnl if actual_price is NaN.
	// If actual_price is a number, then overall is a P&L + exposure * actual_price
	$: overallByUser = Object.fromEntries(
		Object.entries(pnlByUser)
			.map(([user, pnl]) => {
				let exposure = exposureByUser[user];
				if (exposure === 0) {
					return [user, `${pnl}`];
				}
				return [
					user,
					isNaN(actual_price)
						? `${pnl}`
						: `${pnl} + ${exposure} * ${actual_price} = ${pnl + exposure * actual_price}`
				];
				// @ts-ignore
			})
			.sort((a, b) => {
				return Number(b[1].split(' ').at(-1)) - Number(a[1].split(' ').at(-1));
			})
	);

	function updateActualPrice() {
		if (input === '') {
			actual_price = NaN;
		} else {
			actual_price = parseFloat(input);
		}
		input = '';
	}
</script>

<!-- You can now use `pnlByUser` and `exposureByUser` in your Svelte template -->
<h1
	class="text-3xl font-bold text-center py-5 border-l text-white [text-shadow:_0_2px_2px_rgb(0_0_0_/_80%)]"
	style="background-color: #00B050"
>
	Trade Review
</h1>

<!-- table of name, pnl, expose from overallByUser, and exposure-->
<table class="min-w-full divide-y divide-gray-200 text-center border-r border-b">
	<thead class="bg-gray-50">
		<tr>
			<th
				scope="col"
				class="w-1/3 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
			>
				Name
			</th>
			<th
				scope="col"
				class="w-1/3 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
			>
				Exposure
			</th>
			<th
				scope="col"
				class="w-1/3 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
			>
				P&L
			</th>
		</tr>
	</thead>
	<tbody class="bg-white divide-y divide-gray-200">
		{#each Object.entries(overallByUser) as [user, overall], index}
			<tr>
				<td class="px-6 py-4 whitespace-nowrap">
					<div class="text-sm text-gray-900"><strong>{index + 1}.</strong> {user}</div>
				</td>
				<td class="px-6 py-4 whitespace-nowrap">
					<div class="text-sm text-gray-900">{exposureByUser[user]}</div>
				</td>
				<td class="px-6 py-4 whitespace-nowrap">
					<div class="text-sm text-gray-900">{overall}</div>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<footer class="fixed bottom-0 left-0 w-full flex flex-row items-end">
	<form class="p-4 flex flex-col bg-white w-full" on:submit|preventDefault={updateActualPrice}>
		<input
			type="text"
			placeholder={isNaN(actual_price)
				? 'Enter the price of the underlying asset'
				: 'The current asset price is ' + actual_price + '. Press enter to reset'}
			class="shadow appearance-none border rounded p-5 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
			bind:value={input}
		/>
	</form>
</footer>
<div class="absolute top-0 left-0 p-5 flex flex-row justify-between gap-2 w-full">
	<button
		class="rounded p-2 bg-blue-500 text-white font-bold"
		on:click={() => (window.location.href = '/')}
	>
		Back to Orderbooks
	</button>
	<button class="rounded p-2 bg-red-500 text-white font-bold" on:click={() => clearStorage()}>
		Reset
	</button>
</div>
