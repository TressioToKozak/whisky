import type { Whisky, WhiskyType } from './model.ts'
export const typeNames: Record<WhiskyType,string> = {
  'single-malt-scotch':'Single Malt Scotch Whisky','blended-malt-scotch':'Blended Malt Scotch Whisky','blended-scotch':'Blended Scotch Whisky','single-grain':'Single Grain Whisky',bourbon:'Bourbon',rye:'Rye Whiskey',tennessee:'Tennessee Whiskey','irish-blended':'Irish Blended Whiskey','irish-single-malt':'Irish Single Malt','irish-pot-still':'Irish Single Pot Still','japanese-single-malt':'Japanese Single Malt','japanese-blended':'Japanese Blended Whisky','single-malt':'Single Malt Whisky','blended-whisky':'Blended Whisky','whisky-liqueur':'Likier na bazie whisky','flavoured-spirit':'Napój spirytusowy na bazie whisky','whisky-punch':'Whiskey punch',unknown:'Inne / nieustalony typ',
}
export function ageStatus(whisky: Whisky) { return whisky.age !== null ? 'stated' : whisky.ageStatus === 'nas' ? 'nas' : 'unknown' }
export const typeOf = (whisky: Whisky): WhiskyType => whisky.whiskyType ?? 'unknown'
