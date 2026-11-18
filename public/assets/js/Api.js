export class ApiError extends Error{constructor(message,status,reference=null){super(message);this.status=status;this.reference=reference;}}
export class Api{
 constructor(){this.csrf='';}
 async request(path,{method='GET',data,form}={}){
  const headers={Accept:'application/json'};if(method!=='GET')headers['X-CSRF-Token']=this.csrf;if(data)headers['Content-Type']='application/json';
  let response;try{response=await fetch(new URL('api/'+path,document.baseURI),{method,cache:'no-store',credentials:'same-origin',headers,body:form||(data?JSON.stringify(data):undefined),signal:AbortSignal.timeout(25000)});}catch{throw new ApiError('Conexão interrompida. Sua partida está salva; sincronize antes de tentar de novo.',0);}
  let result;try{result=await response.json()}catch{throw new ApiError('O servidor não retornou JSON. Verifique a versão do PHP e a instalação.',response.status);}
  if(!response.ok||!result.ok)throw new ApiError(result.error?.message||'Não foi possível concluir a ação.',response.status,result.error?.reference||null);return result.data;
 }
 async session(){const s=await this.request('session');this.csrf=s.csrf;return s;}
}
