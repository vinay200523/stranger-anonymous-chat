import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { existsSync } from "node:fs";
import path from "node:path";

const app=express();
app.use(cors({origin:true}));
app.get("/health",(_req,res)=>res.json({ok:true,service:"stranger-chat"}));
if (existsSync(path.resolve("dist"))) {
  app.use(express.static(path.resolve("dist")));
  app.get("*",(_req,res)=>res.sendFile(path.resolve("dist/index.html")));
}
const httpServer=createServer(app);
const io=new Server(httpServer,{cors:{origin:"*",methods:["GET","POST"]}});
const waiting={text:null,video:null};
const partner=new Map();
const modeOf=new Map();

function leave(socket,notify=true){
  const peerId=partner.get(socket.id);
  if(peerId){
    partner.delete(socket.id); partner.delete(peerId);
    const peer=io.sockets.sockets.get(peerId);
    if(peer && notify) peer.emit("partner-left");
  }
  for(const mode of Object.keys(waiting)) if(waiting[mode]===socket.id) waiting[mode]=null;
  modeOf.delete(socket.id);
}
function match(socket,mode){
  leave(socket,false); modeOf.set(socket.id,mode);
  const waitingId=waiting[mode];
  if(waitingId && waitingId!==socket.id && io.sockets.sockets.has(waitingId)){
    waiting[mode]=null; partner.set(socket.id,waitingId); partner.set(waitingId,socket.id);
    socket.emit("matched",{initiator:true}); io.to(waitingId).emit("matched",{initiator:false});
  } else { waiting[mode]=socket.id; socket.emit("waiting"); }
}
io.on("connection",socket=>{
  socket.on("find-partner",({mode}={})=>{
    if(!["text","video"].includes(mode)) return;
    match(socket,mode);
  });
  socket.on("message",({text}={})=>{
    const peer=partner.get(socket.id);
    if(peer && typeof text==="string" && text.trim().length && text.length<=2000)
      io.to(peer).emit("message",{text:text.trim().slice(0,2000)});
  });
  for(const event of ["webrtc-offer","webrtc-answer","webrtc-ice"])
    socket.on(event,payload=>{const peer=partner.get(socket.id); if(peer) io.to(peer).emit(event,payload);});
  socket.on("next",()=>{const mode=modeOf.get(socket.id)||"text"; leave(socket); match(socket,mode);});
  socket.on("report",()=>{const peer=partner.get(socket.id); if(peer) io.to(peer).emit("reported-disconnect"); leave(socket);});
  socket.on("disconnect",()=>leave(socket));
});
const port=process.env.PORT||3001;
httpServer.listen(port,"0.0.0.0",()=>console.log("Stranger signaling server listening on "+port));