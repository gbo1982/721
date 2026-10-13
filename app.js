const DATA=window.MAP_DATA;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const codes=Object.keys(DATA);let employee=new URLSearchParams(location.search).get('employee')||'All';if(!DATA[employee])employee=codes[0];const rows=DATA[employee];const label=c=>c==='All'?'Combined map':c==='Inactive'?'Inactive':'Employee '+c;const groupLabel=label(employee);document.title=groupLabel+' company map';
document.getElementById('tabs').innerHTML=codes.map(c=>`<a class="${c===employee?'active':''}" href="?employee=${c}">${label(c)}</a>`).join('');
const hasPoint=r=>Number.isFinite(r.lat)&&Number.isFinite(r.lon);const located=rows.filter(hasPoint);const reviews=rows.filter(r=>r.status==='review');document.getElementById('counts').innerHTML=`<b>${groupLabel} · ${rows.length} companies</b><br>${located.length} located · ${reviews.length} approximate / review · ${rows.length-located.length} not located`;
let map,layer;const markers=new Map();if(typeof L==='undefined'){document.getElementById('map').innerHTML='<p class="error">Map library could not load. Check your internet connection. Company addresses remain available in the list and CSV download.</p>'}else{map=L.map('map',{preferCanvas:true}).setView([43.3,16.8],7);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors · Address matching: Esri World Geocoding Service'}).addTo(map);layer=L.layerGroup().addTo(map);}
function popup(r){return `<div class="popup"><strong>${esc(r.name)}</strong><br>${esc(r.id)} · ${r.inactive?'Inactive':'Active'}<br>${esc(r.address)}<br><small>${esc(r.addressType)}${r.exception?' · Slanice exception':''}</small><br><small>${r.status==='review'?'Approximate location: review before travel':'Address match: '+esc(({PointAddress:'building address',StreetAddress:'house-number estimate',StreetName:'street only'})[r.type]||r.type)}<br>Matched address: ${esc(r.matched||'')}</small><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.address)}" target="_blank" rel="noopener">Open address in Google Maps</a></div>`}
function filtered(){const q=document.getElementById('search').value.toLocaleLowerCase();const status=document.getElementById('status').value;return rows.filter(r=>(r.name+' '+r.id+' '+r.address).toLocaleLowerCase().includes(q)&&(status==='all'||(status==='missing'?!hasPoint(r):r.status===status)))}
function render(){const selected=filtered();document.getElementById('list').innerHTML=selected.map(r=>`<div class="row" data-id="${esc(r.id)}"><b>${esc(r.name)}</b><small>${esc(r.street)}, ${esc(r.postal)} ${esc(r.city)}</small><small>${esc(r.id)} · ${esc(r.addressType)}${r.exception?' · Slanice exception':''}</small>${r.status==='review'?'<small class="badge">Approximate location — review</small>':!hasPoint(r)?'<small class="badge">Address could not be located</small>':''}</div>`).join('');if(layer){layer.clearLayers();markers.clear();const groups=new Map();for(const r of selected.filter(hasPoint)){const key=r.lat.toFixed(6)+','+r.lon.toFixed(6);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)}for(const group of groups.values()){const r=group[0];const color=group.some(x=>x.inactive)?'#cf3434':group.some(x=>x.status==='review')?'#d58a12':'#147b97';const marker=L.circleMarker([r.lat,r.lon],{radius:group.length>1?10:7,color:'#fff',weight:2,dashArray:group.some(x=>x.status==='review')?'3 3':null,fillColor:color,fillOpacity:.85}).bindPopup(group.map(popup).join('<hr>'),{maxHeight:350}).bindTooltip(group.map(x=>esc(x.name)).join('<br>')).addTo(layer);for(const item of group)markers.set(item.id,marker)}}document.querySelectorAll('.row').forEach(el=>el.onclick=()=>{const marker=markers.get(el.dataset.id);if(marker){map.setView(marker.getLatLng(),16);marker.openPopup()}else{const r=rows.find(x=>x.id===el.dataset.id);window.open('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(r.address),'_blank','noopener')}})}
function fit(){if(map){const points=filtered().filter(hasPoint).map(r=>[r.lat,r.lon]);if(points.length)map.fitBounds(points,{padding:[30,30],maxZoom:13})}}
document.getElementById('search').oninput=render;document.getElementById('status').onchange=()=>{render();fit()};document.getElementById('fit').onclick=fit;document.getElementById('csv').onclick=()=>{const fields=['id','name','address','addressType','lat','lon','status','type','matched'];const csv='\uFEFF'+[fields,...rows.map(r=>fields.map(k=>r[k]??''))].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='employee-'+employee+'-addresses.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};render();fit();
let locationWatch=null,userPin=null,accuracyCircle=null,radiusCircle=null,latestPosition=null,following=false;
const locationButton=document.getElementById('location');
const locationStatus=document.getElementById('location-status');
function locationMessage(message){locationStatus.textContent=message;}
function centreOnUser(){if(map&&latestPosition&&radiusCircle)map.fitBounds(radiusCircle.getBounds(),{padding:[12,12],animate:false});}
function pauseFollowing(){following=false;locationButton.textContent='Follow my location';locationButton.setAttribute('aria-pressed','false');if(latestPosition)locationMessage('Following paused. Your position is still updating.');}
function receiveLocation(position){
 const c=position.coords;if(!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude))return;
 latestPosition=[c.latitude,c.longitude];const accuracy=Math.max(0,c.accuracy||0);
 if(!userPin){
  radiusCircle=L.circle(latestPosition,{radius:10000,color:'#2468d5',weight:1,dashArray:'6 5',fillColor:'#2468d5',fillOpacity:.035,interactive:false}).addTo(map);
  accuracyCircle=L.circle(latestPosition,{radius:accuracy,color:'#2468d5',weight:1,fillOpacity:.08,interactive:false}).addTo(map);
  userPin=L.circleMarker(latestPosition,{radius:8,color:'#fff',weight:3,fillColor:'#2468d5',fillOpacity:1}).addTo(map).bindTooltip('Your current location');
 }else{radiusCircle.setLatLng(latestPosition);accuracyCircle.setLatLng(latestPosition).setRadius(accuracy);userPin.setLatLng(latestPosition);}
 userPin.bringToFront();
 locationMessage((following?'Following your location · 10 km radius':'Following paused')+' · Accuracy ±'+Math.round(accuracy)+' m');
 if(following)centreOnUser();
}
function locationError(error){
 if(error.code===1){if(locationWatch!==null)navigator.geolocation.clearWatch(locationWatch);locationWatch=null;following=false;locationButton.textContent='Use my location';locationButton.setAttribute('aria-pressed','false');locationMessage('Location access blocked. Allow location in your browser settings, then tap Use my location.');}
 else locationMessage(error.code===3?'Location timed out. Waiting for your next position…':'Location unavailable. Waiting for a position…');
}
function startFollowing(){
 if(!map){locationMessage('Map unavailable. Check your internet connection.');return;}
 if(!navigator.geolocation){locationMessage('This browser does not support location.');return;}
 if(!window.isSecureContext){locationMessage('Open the HTTPS site to use your location.');return;}
 following=true;locationButton.textContent='Pause following';locationButton.setAttribute('aria-pressed','true');locationMessage('Waiting for location permission and your position…');
 if(latestPosition)centreOnUser();
 if(locationWatch===null)locationWatch=navigator.geolocation.watchPosition(receiveLocation,locationError,{enableHighAccuracy:true,maximumAge:5000,timeout:20000});
}
locationButton.onclick=()=>following?pauseFollowing():startFollowing();
document.getElementById('fit').onclick=()=>{pauseFollowing();fit();};
document.getElementById('status').onchange=()=>{render();if(following&&latestPosition)centreOnUser();else fit();};
if(map)map.on('dragstart',pauseFollowing);
window.addEventListener('pagehide',()=>{if(locationWatch!==null)navigator.geolocation.clearWatch(locationWatch);});
if(window.matchMedia('(pointer: coarse)').matches||window.matchMedia('(max-width: 760px)').matches)startFollowing();
