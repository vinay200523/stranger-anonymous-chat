import {useEffect,useRef,useState} from "react";
import {io} from "socket.io-client";
import {MessageCircle,Video,Shuffle,Send,Mic,MicOff,VideoOff,Flag,ShieldCheck,Globe2,Heart,ArrowUpRight} from "lucide-react";

const socket=io(import.meta.env.VITE_SERVER_URL||undefined,{autoConnect:false});
export default function App(){
 const [mode,setMode]=useState("text"),[status,setStatus]=useState("idle"),[messages,setMessages]=useState([]),[draft,setDraft]=useState(""),[connected,setConnected]=useState(false),[muted,setMuted]=useState(false),[cameraOff,setCameraOff]=useState(false);
 const localRef=useRef(null),remoteRef=useRef(null),pcRef=useRef(null),streamRef=useRef(null),chatRef=useRef(null);
 useEffect(()=>{
  socket.connect();
  socket.on("waiting",()=>{setStatus("searching");setConnected(false);});
  socket.on("matched",async({initiator})=>{setStatus("connected");setConnected(true);setMessages([]);if(mode==="video") await startCall(initiator);});
  socket.on("message",m=>setMessages(v=>[...v,{...m,own:false}]));
  socket.on("partner-left",()=>{cleanupCall();setStatus("idle");setConnected(false);setMessages(v=>[...v,{text:"The other person disconnected.",system:true}]);});
  socket.on("reported-disconnect",()=>{cleanupCall();setStatus("idle");setConnected(false);});
  socket.on("webrtc-offer",async offer=>{if(!pcRef.current) await startCall(false);await pcRef.current.setRemoteDescription(offer);const answer=await pcRef.current.createAnswer();await pcRef.current.setLocalDescription(answer);socket.emit("webrtc-answer",answer);});
  socket.on("webrtc-answer",async answer=>{if(pcRef.current) await pcRef.current.setRemoteDescription(answer);});
  socket.on("webrtc-ice",async candidate=>{try{await pcRef.current?.addIceCandidate(candidate);}catch(e){console.warn(e);}});
  return()=>{socket.disconnect();cleanupCall();};
 },[]);
 useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[messages]);
 async function startCall(initiator){
  try{
   const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});streamRef.current=stream;if(localRef.current)localRef.current.srcObject=stream;
   const pc=new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"}]});pcRef.current=pc;
   stream.getTracks().forEach(t=>pc.addTrack(t,stream));
   pc.ontrack=e=>{if(remoteRef.current)remoteRef.current.srcObject=e.streams[0];};
   pc.onicecandidate=e=>{if(e.candidate)socket.emit("webrtc-ice",e.candidate);};
   if(initiator){const offer=await pc.createOffer();await pc.setLocalDescription(offer);socket.emit("webrtc-offer",offer);}
  }catch(e){setMessages(v=>[...v,{text:"Camera/microphone permission is needed for video chat. You can switch to text chat.",system:true}]);setMode("text");}
 }
 function cleanupCall(){pcRef.current?.close();pcRef.current=null;streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;if(localRef.current)localRef.current.srcObject=null;if(remoteRef.current)remoteRef.current.srcObject=null;}
 function find(){cleanupCall();setMessages([]);setStatus("searching");socket.emit("find-partner",{mode});}
 function next(){cleanupCall();setMessages([]);setStatus("searching");socket.emit("next");}
 function send(){if(!draft.trim()||!connected)return;const text=draft.trim();setMessages(v=>[...v,{text,own:true}]);socket.emit("message",{text});setDraft("");}
 function report(){socket.emit("report");cleanupCall();setConnected(false);setStatus("idle");setMessages(v=>[...v,{text:"You disconnected and reported this conversation.",system:true}]);}
 const active=status==="connected";
 return <main className="app"><header className="topbar"><a className="brand" href="#"><span className="brandmark"><Globe2 size={21}/></span> stranger<span className="branddot">.</span></a><div className="topright"><span className="online"><i/> anonymous by design</span><a className="safety" href="#safety"><ShieldCheck size={15}/> Safety</a></div></header>
 <section className="hero"><div className="eyebrow"><span/> A LITTLE LESS STRANGE</div><h1>One world.<br/><em>A million</em> conversations.</h1><p>Meet someone new, somewhere out there. No profiles, no pressure — just a fresh connection.</p></section>
 <section className="workspace"><aside className="sidepanel"><div className="panel-label">YOUR EXPERIENCE</div><button className={mode==="text"?"mode active":"mode"} onClick={()=>{setMode("text");if(status!=="idle"){socket.emit("next");cleanupCall();setStatus("idle");setConnected(false);}}}><span className="modeicon"><MessageCircle/></span><span><b>Text chat</b><small>Start with a conversation</small></span><ArrowUpRight size={16}/></button><button className={mode==="video"?"mode active":"mode"} onClick={()=>{setMode("video");if(status!=="idle"){socket.emit("next");cleanupCall();setStatus("idle");setConnected(false);}}}><span className="modeicon"><Video/></span><span><b>Video chat</b><small>Meet face to face</small></span><ArrowUpRight size={16}/></button><div className="side-note"><ShieldCheck size={18}/><div><b>Your privacy matters</b><p>You're identified only as a stranger. Never share personal details with someone you don't know.</p></div></div><div className="side-bottom"><span>MADE FOR REAL CONNECTIONS</span><Heart size={13}/></div></aside>
 <section className="chatpanel"><div className="chathead"><div><span className="live-dot"/><b>{active?"You're connected":status==="searching"?"Finding someone":"Ready when you are"}</b><small>{active?"A new conversation starts here":status==="searching"?"Looking for a stranger around the world":"Your next conversation could be anywhere"}</small></div><span className="anon-tag">ANONYMOUS</span></div>
 {mode==="video"?<div className="videostage"><div className="remote-video">{active?<video ref={remoteRef} autoPlay playsInline/>:<div className="video-placeholder"><Video size={34}/><span>{status==="searching"?"Finding your next face…":"Your next conversation starts with a hello."}</span></div>}<span className="video-label">STRANGER</span></div><div className="local-video"><video ref={localRef} autoPlay muted playsInline/><span>YOU</span></div></div>:<div className="chatbody" ref={chatRef}>{messages.length===0?<div className="empty-state"><div className="empty-orb"><MessageCircle size={26}/></div><h3>{active?"Say hello.":"A blank page, a new story."}</h3><p>{active?"You’re connected with a stranger. Be kind and enjoy the conversation.":"Press start to be paired with someone new. Every chat is a fresh start."}</p></div>:messages.map((m,i)=><div key={i} className={m.system?"system-message":m.own?"bubble own":"bubble"}>{m.text}</div>)}</div>}
 {mode==="video"&&messages.length>0&&<div className="video-messages">{messages.map((m,i)=><div key={i} className={m.system?"system-message":m.own?"bubble own":"bubble"}>{m.text}</div>)}</div>}
 <div className="chat-controls">{mode==="text"&&<form className="composer" onSubmit={e=>{e.preventDefault();send();}}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder={active?"Type a message…":"Start a chat to send a message"} disabled={!active}/><button disabled={!active||!draft.trim()} aria-label="Send"><Send size={17}/></button></form>}{mode==="video"&&<div className="video-tools"><button onClick={()=>{setMuted(v=>!v);streamRef.current?.getAudioTracks().forEach(t=>t.enabled=muted);}}>{muted?<MicOff/>:<Mic/>}</button><button onClick={()=>{setCameraOff(v=>!v);streamRef.current?.getVideoTracks().forEach(t=>t.enabled=cameraOff);}}>{cameraOff?<VideoOff/>:<Video/>}</button></div>}<div className="action-row">{active?<><button className="next-btn" onClick={next}><Shuffle size={16}/> Next stranger</button><button className="report-btn" onClick={report}><Flag size={15}/> Report</button></>:<button className="start-btn" onClick={find}><Shuffle size={17}/>{status==="searching"?"Searching…":"Find a stranger"}</button>}</div></div>
 </section></section>
 <footer id="safety"><ShieldCheck size={15}/><span>Be respectful. Don't share private information. You can leave or report a chat at any time.</span><span className="footer-right">A small hello can go a long way.</span></footer>
 </main>;
}