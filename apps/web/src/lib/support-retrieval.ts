export type SupportDoc = {id:string;title:string;href:string;content:string};
const stop = new Set(['the','a','an','to','is','are','how','can','i','my','of','and','in','do','does','what','where','you','your','for','with','it','on','me','about']);
function words(v:string):string[] {return (v.toLowerCase().match(/[a-z0-9]+/g)||[]).filter(w=>w.length>1&&!stop.has(w));}
export function findSupportDoc(question:string,docs:SupportDoc[]):SupportDoc|null {
  const q=[...new Set(words(question))];
  if(!q.length)return null;
  const ranked=docs.map(doc=>{
    const title=new Set(words(doc.title));const body=new Set(words(doc.content));
    return {doc, score:q.reduce((sum,w)=>sum+(title.has(w)?3:body.has(w)?1:0),0)};
  }).sort((a,b)=>b.score-a.score);
  return ranked[0]&&ranked[0].score>=2?ranked[0].doc:null;
}
