import net from 'node:net';
// Local-only TCP proxy. Used to reproduce the measured ~66 ms RTT without touching staging.
export async function latencyProxy(connectionString:string,oneWayMs:number){
 const source=new URL(connectionString);
 if(!['127.0.0.1','localhost','[::1]'].includes(source.hostname))throw new Error('Latency proxy only accepts loopback PostgreSQL');
 if(!Number.isFinite(oneWayMs)||oneWayMs<0||oneWayMs>100)throw new Error('Latency must be 0..100 ms per direction');
 const targetPort=Number(source.port||5432),targetHost=source.hostname;
 const sockets=new Set<net.Socket>();
 const server=net.createServer(client=>{
  const upstream=net.connect(targetPort,targetHost);
  for(const socket of [client,upstream]){sockets.add(socket);socket.setNoDelay(true);socket.on('error',()=>{client.destroy();upstream.destroy();});socket.on('close',()=>sockets.delete(socket));}
  client.on('data',chunk=>setTimeout(()=>{if(!upstream.destroyed)upstream.write(chunk);},oneWayMs));
  upstream.on('data',chunk=>setTimeout(()=>{if(!client.destroyed)client.write(chunk);},oneWayMs));
  client.on('end',()=>setTimeout(()=>upstream.end(),oneWayMs));upstream.on('end',()=>setTimeout(()=>client.end(),oneWayMs));
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 source.hostname='127.0.0.1';source.port=String((server.address() as net.AddressInfo).port);
 return {url:source.toString(),close:async()=>{for(const socket of sockets)socket.destroy();await new Promise<void>(resolve=>server.close(()=>resolve()));}};
}
