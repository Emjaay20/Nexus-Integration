export type TestEvent={event:string;source:string;status:'success'|'failure'};
// Explicitly allow fixture identifiers, not arbitrary text or customer payloads.
const identifier=/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/;
export function parseTestEvent(value:unknown):TestEvent|null{
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const {event,source,status}=value as Record<string,unknown>;
  if(typeof event!=='string'||event.length>100||!identifier.test(event)||typeof source!=='string'||source.length>50||!identifier.test(source)||(status!==undefined&&status!=='success'&&status!=='failure'))return null;
  return {event,source,status:status==='failure'?'failure':'success'};
}
export function validTestKey(value:string):boolean{return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
