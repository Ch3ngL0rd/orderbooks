import { get, writable } from 'svelte/store';
import { browser } from '$app/environment';
import { addTrade } from './trades';

/**
 * @typedef {Object} OrderEntry
 * @property {string} id - The unique ID of the order entry
 * @property {string} user - The user who placed the order
 * @property {number} price - The price of the order
 * @property {number} timestamp - The timestamp of the order
 */

/**
 * @typedef {Object} Orderbooks
 * @property {import('svelte/store').Writable<OrderEntry[]>} bids - The bids of the orderbook
 * @property {import('svelte/store').Writable<OrderEntry[]>} asks - The asks of the orderbook
 */

// const initialValue = browser ? JSON.parse(localStorage.getItem('orderbooks') ||
//     "{bids:[],asks:[]}"
// ) : { bids: [], asks: [] };

const initialValue = browser ? JSON.parse(localStorage.getItem('orderbooks') || '{"bids":[], "asks":[]}') : { bids: [], asks: [] };

export const orderbooks = writable(initialValue);

orderbooks.subscribe(value => {
    if (browser) localStorage.setItem('orderbooks', JSON.stringify(value));
});

/**
 * @param {OrderEntry} bid
 */
export function addBid(bid) {
    console.log('addBid', bid);
    let currentOrderbooks = get(orderbooks);

    // Check if there are asks
    if (currentOrderbooks.asks.length > 0) {
        // Sort asks by price in ascending order, then by timestamp
        let sortedAsks = currentOrderbooks.asks.sort((/** @type {{ price: number; timestamp: number; }} */ a, /** @type {{ price: number; timestamp: number; }} */ b) => a.price - b.price || a.timestamp - b.timestamp);

        // Get the lowest ask
        let lowestAsk = sortedAsks[0];

        if (bid.price >= lowestAsk.price) {
            // We have a match

            // Add trades for both users
            const currentTimestamp = Date.now();
            const id = generateId();
            addTrade({
                id,
                side: 'buy',
                price: lowestAsk.price,
                user: bid.user,
                timestamp: currentTimestamp,
                instigator: true
            });
            addTrade({
                id,
                side: 'sell',
                price: lowestAsk.price,
                user: lowestAsk.user,
                timestamp: currentTimestamp,
                instigator: false
            });

            // Remove the matched ask from the asks orderbook
            currentOrderbooks.asks = currentOrderbooks.asks.filter((/** @type {{ id: string; }} */ ask) => ask.id !== lowestAsk.id);

            // Update the orderbooks
            orderbooks.set(currentOrderbooks);

            // Exit the function since the bid was matched and shouldn't be added to the bid orderbook
            return;
        }
    }

    // If no match was found, add the bid to the bid orderbook
    orderbooks.update(current => {
        current.bids = [...current.bids, bid];
        return current;
    });
}
/**
 * @param {OrderEntry} ask
 */
export function addAsk(ask) {
    console.log('addAsk', ask);
    let currentOrderbooks = get(orderbooks);

    // Check if there are bids
    if (currentOrderbooks.bids.length > 0) {
        // Sort bids by price in descending order, then by timestamp
        let sortedBids = currentOrderbooks.bids.sort((/** @type {{ price: number; timestamp: number; }} */ a, /** @type {{ price: number; timestamp: number; }} */ b) => b.price - a.price || a.timestamp - b.timestamp);

        // Get the highest bid
        let highestBid = sortedBids[0];

        if (ask.price <= highestBid.price) {
            // We have a match

            // Add trades for both users
            const currentTimestamp = Date.now();
            const id = generateId();
            addTrade({
                id,
                side: 'sell',
                price: highestBid.price,
                user: ask.user,
                timestamp: currentTimestamp,
                instigator: true
            });
            addTrade({
                id,
                side: 'buy',
                price: highestBid.price,
                user: highestBid.user,
                timestamp: currentTimestamp,
                instigator: false
            });

            // Remove the matched bid from the bids orderbook
            currentOrderbooks.bids = currentOrderbooks.bids.filter((/** @type {{ id: string; }} */ bid) => bid.id !== highestBid.id);

            // Update the orderbooks
            orderbooks.set(currentOrderbooks);

            // Exit the function since the ask was matched and shouldn't be added to the ask orderbook
            return;
        }
    }

    // If no match was found, add the ask to the ask orderbook
    orderbooks.update(current => {
        current.asks = [...current.asks, ask];
        return current;
    });
}

/**
 * @param {string} username
 */
export function buy(username) {
    let currentOrderbooks = get(orderbooks);

    // 1. check that there are asks
    if (currentOrderbooks.asks.length === 0) {
        console.error("No available asks to fulfill the buy order");
        return;
    }

    // 2. sort asks by price in ascending order, then by timestamp
    let sortedAsks = currentOrderbooks.asks.sort((/** @type {{ price: number; timestamp: number; }} */ a, /** @type {{ price: number; timestamp: number; }} */ b) => a.price - b.price || a.timestamp - b.timestamp);

    // 3. get the lowest ask
    let lowestAsk = sortedAsks[0];

    // 4. add trades for both users
    const currentTimestamp = Date.now();
    const id = generateId();
    addTrade({
        id,
        side: 'buy',
        price: lowestAsk.price,
        user: username,
        timestamp: currentTimestamp,
        instigator: true
    });
    addTrade({
        id,
        side: 'sell',
        price: lowestAsk.price,
        user: lowestAsk.user,
        timestamp: currentTimestamp,
        instigator: false
    });

    // 5. remove the matched ask from the asks orderbook
    currentOrderbooks.asks = currentOrderbooks.asks.filter((/** @type {{ id: string; }} */ ask) => ask.id !== lowestAsk.id);

    // 6. update the orderbooks
    orderbooks.set(currentOrderbooks);
}


/**
 * @param {string} username
 */
export function sell(username) {
    let currentOrderbooks = get(orderbooks);

    // 1. check that there are bids
    if (currentOrderbooks.bids.length === 0) {
        console.error("No available bids to fulfill the sell order");
        return;
    }

    // 2. sort bids by price in descending order, then by timestamp
    let sortedBids = currentOrderbooks.bids.sort((/** @type {{ price: number; timestamp: number; }} */ a, /** @type {{ price: number; timestamp: number; }} */ b) => b.price - a.price || a.timestamp - b.timestamp);

    // 3. get the highest bid
    let highestBid = sortedBids[0];

    // 4. add trades for both users
    const currentTimestamp = Date.now();
    const id = generateId();
    addTrade({
        id,
        side: 'sell',
        price: highestBid.price,
        user: username,
        timestamp: currentTimestamp,
        instigator: true
    });
    addTrade({
        id,
        side: 'buy',
        price: highestBid.price,
        user: highestBid.user,
        timestamp: currentTimestamp,
        instigator: false
    });

    // 5. remove the matched bid from the bids orderbook
    currentOrderbooks.bids = currentOrderbooks.bids.filter((/** @type {{ id: string; }} */ bid) => bid.id !== highestBid.id);

    // 6. update the orderbooks
    orderbooks.set(currentOrderbooks);
}

/**
 * @param {string} username
 * @param {number} price
 */
export function cancelOrderAtPrice(username, price) {
    let currentOrderbooks = get(orderbooks);

    // 1. Filter asks to remove the specific order
    currentOrderbooks.asks = currentOrderbooks.asks.filter((/** @type {{ user: string; price: number; }} */ ask) => {
        return !(ask.user === username && ask.price === price);
    });

    // 2. Filter bids to remove the specific order
    currentOrderbooks.bids = currentOrderbooks.bids.filter((/** @type {{ user: string; price: number; }} */ bid) => {
        return !(bid.user === username && bid.price === price);
    });

    // 3. Update the orderbooks
    orderbooks.set(currentOrderbooks);
}

/**
 * @param {string} bidId
 */
export function removeBid(bidId) {
    orderbooks.update(current => {
        current.bids = current.bids.filter((/** @type {{ id: string; }} */ bid) => bid.id !== bidId);
        return current;
    });
}

/**
 * @param {string} askId
 */
export function removeAsk(askId) {
    orderbooks.update(current => {
        current.asks = current.asks.filter((/** @type {{ id: string; }} */ ask) => ask.id !== askId);
        return current;
    });
}

/**
 * @param {string} orderId
 */
export function cancelOrder(orderId) {
    orderbooks.update(current => {
        current.bids = current.bids.filter((/** @type {{ id: string; }} */ bid) => bid.id !== orderId);
        current.asks = current.asks.filter((/** @type {{ id: string; }} */ ask) => ask.id !== orderId);
        return current;
    });
}

export function getOrderbooks() {
    let currentOrderbooks;
    orderbooks.subscribe(value => currentOrderbooks = value)();
    return currentOrderbooks;
}

export function clearStorage() {
    localStorage.clear();
    location.reload();
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}