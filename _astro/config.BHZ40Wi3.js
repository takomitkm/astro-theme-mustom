let t=null;function n(){if(t)return t;const e=document.getElementById("mustom-config");try{t=JSON.parse(e?.textContent||"{}")}catch{t={}}return t}export{n as m};
