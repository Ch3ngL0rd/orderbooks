// trades.js
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * @typedef {Object} Trade
 * @property {string} id - The unique ID of the trade
 * @property {string} side - The side of the trade ('buy' or 'sell')
 * @property {number} price - The price of the trade
 * @property {string} user - The user of the trade
 * @property {number} timestamp - The timestamp of the trade
 * @property {boolean} instigator - Whether the user was the instigator of the trade
 */

/**
 * A writable store of trades
 * @type {import('svelte/store').Writable<Trade[]>}
 */
export const tradesStore = writable(browser && JSON.parse(localStorage.getItem('trades') || "[]") || []);

tradesStore.subscribe(value => {
    if (browser) localStorage.setItem('trades', JSON.stringify(value));
});

/**
 * Add a new trade to the store.
 * @param {Trade} trade
 */
export function addTrade(trade) {
    tradesStore.update(current => [...current, trade]);
}

/**
 * Add a new trade to the store.
 * @param {string} tradeID
 */
export function removeTrade(tradeID) {
    tradesStore.update(current => current.filter(t => t.id !== tradeID));
}


/**
 * Add a new trade to the store.
 * @param {string} tradeID
 * @param {Trade} trade
 */
export function updateTrade(tradeID, trade) {
    tradesStore.update(current => current.map(t => t.id === tradeID ? trade : t));
}

/**
 * Get all the trades from the store.
 * @returns {Trade[]}
 */
export function getAllTrades() {
    /**
     * @type {Trade[]}
     */
    let currentTrades = [];
    tradesStore.subscribe(value => currentTrades = value)();
    return currentTrades;
}

export const trades = tradesStore;

/**
 * Get all trades grouped by each user.
 * @returns {Object.<string, Trade[]>} - An object where each key is a username and the value is an array of their trades.
 */
export function getAllTradesByUser() {
    /**
     * @type {Object.<string, Trade[]>}
    */
    let tradesByUser = {};

    tradesStore.subscribe(trades => {
        for (let trade of trades) {
            if (!tradesByUser[trade.user]) {
                tradesByUser[trade.user] = [];
            }
            tradesByUser[trade.user].push(trade);
        }
    })();

    return tradesByUser;
}

/**
 * Group trades by their ID.
 * @param {Trade[]} trades - The trades to group.
 */
export function groupTradesById(trades) {

    /** @type {Object<string, Object<string, Trade>>} */
    let trades_by_id = {}
    for (let trade of trades) {
        if (!trades_by_id[trade.id]) {
            trades_by_id[trade.id] = {
                
            };
        }
        trades_by_id[trade.id][trade.side] = trade;
    }
    return trades_by_id;
}
