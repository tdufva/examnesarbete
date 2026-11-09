export function downloadBlob(blob,name){
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export function csvText(rows){
 return '\ufeff'+rows.map(row=>row.map(value=>{let s=String(value??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(';')).join('\r\n');
}
export function downloadCsv(rows,name){downloadBlob(new Blob([csvText(rows)],{type:'text/csv;charset=utf-8'}),name);}
function wrapped(ctx,text,width){
 const lines=[];let line='';for(const word of String(text).split(/\s+/)){if(ctx.measureText(line+' '+word).width>width&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;
}
export async function chartPng({title,subtitle,rows,note,filename,metric='percent'}){
 await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,1500))]);
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=1400;
 ctx.font='bold 34px Inter, sans-serif';const headings=wrapped(ctx,title,1270);
 ctx.font='20px Inter, sans-serif';const notes=wrapped(ctx,note,1270),subtitles=wrapped(ctx,subtitle,1270);
 const rowHeights=rows.map(r=>Math.max(65,wrapped(ctx,r.label,360).length*24+24));
 canvas.height=220+headings.length*42+subtitles.length*27+rowHeights.reduce((s,h)=>s+h,0)+notes.length*25;
 ctx.fillStyle='#f5f0e6';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#c6281e';ctx.fillRect(60,45,55,7);
 const maximum=metric==='percent'?100:Math.max(1,...rows.map(r=>r.count));
 let y=100;ctx.font='bold 34px Inter, sans-serif';ctx.fillStyle='#151515';for(const line of headings){ctx.fillText(line,60,y);y+=42;}
 ctx.font='20px Inter, sans-serif';for(const line of subtitles){ctx.fillText(line,60,y);y+=27;}y+=24;
 rows.forEach((r,i)=>{ctx.fillStyle='#151515';const labels=wrapped(ctx,r.label,360);labels.forEach((line,j)=>ctx.fillText(line,60,y+j*24+20));const mid=y+Math.max(14,labels.length*12);ctx.fillStyle='#dfd8ca';ctx.fillRect(450,mid-10,650,20);if(r.percent!==null){ctx.fillStyle=r.color||'#2448c6';ctx.fillRect(450,mid-10,650*(metric==='percent'?r.percent:r.count)/maximum,20);}ctx.fillStyle='#151515';ctx.textAlign='right';ctx.fillText(r.percent===null?'—':`${r.count}/${r.total} · ${r.percent.toLocaleString('sv-SE',{maximumFractionDigits:1})} %`,1340,mid+7);ctx.textAlign='left';y+=rowHeights[i];});
 y+=20;ctx.font='18px Inter, sans-serif';ctx.fillStyle='#595752';for(const line of notes){ctx.fillText(line,60,y);y+=25;}
 ctx.fillText('Examensarbeten · tdufva.github.io/examnesarbete · AI-assisterad kodning',60,canvas.height-28);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('PNG kunde inte skapas');downloadBlob(blob,filename);return {width:canvas.width,height:canvas.height,preview:canvas.toDataURL('image/png')};
}
export function correctionUrl(record){
 const params=new URLSearchParams({template:'korrigering.yml',title:'Korrigering: '+record.original_title,source:record.original_title+' · '+record.authors+' · '+record.year+'\nID: '+record.id+(record.source_url?'\n'+record.source_url:''),correction:'Jag föreslår följande rättelse:\n\nKällstöd (t.ex. PDF-sida):\n'});
 return 'https://github.com/tdufva/examnesarbete/issues/new?'+params;
}
export async function matrixPng({matrix,title,subtitle,filename}){
 await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,1500))]);
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),cellWidth=150,rowHeight=72,left=320,top=285;
 canvas.width=Math.max(1100,left+matrix.columns.length*cellWidth+50);canvas.height=top+matrix.rows.length*rowHeight+140;
 ctx.fillStyle='#f5f0e6';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#c6281e';ctx.fillRect(40,35,55,6);ctx.fillStyle='#151515';ctx.font='bold 30px Inter, sans-serif';ctx.fillText(title,40,85);
 ctx.font='18px Inter, sans-serif';wrapped(ctx,subtitle,canvas.width-80).forEach((line,i)=>ctx.fillText(line,40,120+i*24));
 ctx.font='bold 16px Inter, sans-serif';matrix.columns.forEach((c,i)=>wrapped(ctx,c.label,cellWidth-22).forEach((line,j)=>ctx.fillText(line,left+i*cellWidth+10,195+j*20)));
 matrix.rows.forEach((row,j)=>{const y=top+j*rowHeight;ctx.fillStyle='#151515';ctx.font='16px Inter, sans-serif';wrapped(ctx,row.label,left-70).forEach((line,k)=>ctx.fillText(line,40,y+27+k*20));row.cells.forEach((cell,i)=>{const x=left+i*cellWidth;ctx.fillStyle=cell.percent===null?'#e7e1d6':`rgba(36,72,198,${Math.max(.04,cell.percent/100*.38)})`;ctx.fillRect(x,y,cellWidth-3,rowHeight-3);ctx.fillStyle='#151515';ctx.font='bold 17px Inter, sans-serif';ctx.fillText(cell.percent===null?'—':`${cell.count} / ${cell.denominator}`,x+12,y+28);ctx.font='16px Inter, sans-serif';ctx.fillText(cell.percent===null?'Saknad nämnare':cell.percent.toLocaleString('sv-SE',{maximumFractionDigits:1})+' %',x+12,y+52);});});
 const bottom=top+matrix.rows.length*rowHeight;ctx.font='17px Inter, sans-serif';ctx.fillStyle='#595752';wrapped(ctx,`Cellens nämnare: ${matrix.normalization==='theme'?'arbeten med radens tema':'alla arbeten i urvalet'}. Teman och metodkoder överlappar. ${matrix.columns.length} visade metodkategorier. Beskrivande samband, inte orsak eller kvalitet.`,canvas.width-80).forEach((line,i)=>ctx.fillText(line,40,bottom+40+i*24));ctx.fillText('Examensarbeten · tdufva.github.io/examnesarbete · AI-assisterad kodning',40,canvas.height-28);
 const preview=canvas.toDataURL('image/png'),blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('PNG kunde inte skapas');downloadBlob(blob,filename);return {preview,width:canvas.width,height:canvas.height};
}
