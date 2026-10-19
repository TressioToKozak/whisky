import {activeBottle} from './collection-model.ts'
import type {OwnedBottle,Currency} from './collection-model.ts'
import {cellarValue} from './pricing.ts'
import type {PriceQuote} from './pricing.ts'
export type CurrencyTotal={currency:Currency;amount:number;count:number}
function totals(rows:{currency:Currency;amount:number}[]):CurrencyTotal[]{const sums=new Map<Currency,{cents:number;count:number}>();for(const row of rows){const s=sums.get(row.currency)??{cents:0,count:0};s.cents+=Math.round(row.amount*100);s.count++;sums.set(row.currency,s)}return [...sums].map(([currency,s])=>({currency,amount:s.cents/100,count:s.count}))}
export function collectionFinance(bottles:OwnedBottle[],quotes:Record<string,PriceQuote>){
 const active=bottles.filter(activeBottle),costs=active.filter(b=>b.purchase.kind==='purchase'&&b.purchase.amount!==null),sold=bottles.filter(b=>b.status==='sold')
 const soldKnown=sold.filter(b=>b.sale?.amount!==null&&b.sale?.amount!==undefined),soldNet=soldKnown.filter(b=>b.sale?.fees!==null)
 const realised=soldNet.filter(b=>b.purchase.kind==='purchase'&&b.purchase.amount!==null&&b.purchase.currency===b.sale!.currency)
 return{
  costs:totals(costs.map(b=>({currency:b.purchase.currency!,amount:b.purchase.amount!}))),costUnknown:active.filter(b=>b.purchase.kind!=='gift'&&(b.purchase.kind!=='purchase'||b.purchase.amount===null)).length,gifts:active.filter(b=>b.purchase.kind==='gift').length,
  wholeBottleReference:cellarValue(active.map(b=>({whiskyId:b.whiskyId,quantity:1})),quotes),closedReference:cellarValue(active.filter(b=>b.status==='closed').map(b=>({whiskyId:b.whiskyId,quantity:1})),quotes),openCount:active.filter(b=>b.status==='open').length,
  saleGross:totals(soldKnown.map(b=>({currency:b.sale!.currency!,amount:b.sale!.amount!}))),saleGrossUnknown:sold.length-soldKnown.length,
  saleNet:totals(soldNet.map(b=>({currency:b.sale!.currency!,amount:b.sale!.amount!-b.sale!.fees!}))),saleNetUnknown:sold.length-soldNet.length,
  realised:totals(realised.map(b=>({currency:b.sale!.currency!,amount:b.sale!.amount!-b.sale!.fees!-b.purchase.amount!}))),realisedUnknown:sold.length-realised.length,
 }
}
