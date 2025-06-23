// import { useEffect, useRef, useState } from "react";
// import { X } from "lucide-react";
// import Modal from "../components/Modal";
// import { getBehaviours, patchVidBeh } from "../services/api";

// export default function BehaviourPickerModal({ open, onClose, video, onSaved }) {
//   /* ───── data ───── */
//   const [bank, setBank] = useState([]);
//   const [sel , setSel ] = useState(new Map());   // id → name
//   /* input & dropdown */
//   const [q, setQ]       = useState("");
//   const [show, setShow] = useState(false);
//   const boxRef = useRef();

//   useEffect(() => {
//     if (!open) return;
//     getBehaviours().then(r => {
//       setBank(r.data);
//       setSel(new Map(video.behaviours.map(b => [b._id, b.name])));
//       setQ("");
//       setShow(false);
//     });
//   }, [open, video]);

//   /* close dropdown on outside click */
//   useEffect(()=>{
//     const fn = e=>{ if(show && !boxRef.current?.contains(e.target)) setShow(false); };
//     window.addEventListener("mousedown", fn);
//     return ()=>window.removeEventListener("mousedown", fn);
//   },[show]);

//   /* helpers */
//   const add    = b => setSel(m=> new Map(m).set(b._id, b.name));
//   const remove = id=> setSel(m=> { const n=new Map(m); n.delete(id); return n; });
//   const save   = async()=>{
//     const ids = Array.from(sel.keys());
//     const { data } = await patchVidBeh(video._id, { behaviours: ids });
//     onSaved(data);
//     onClose();
//   };

//   /* filtered (hide until input has 1+ char or dropdown opened manually) */
//   const filtered = bank.filter(b =>
//     !sel.has(b._id) &&
//     (q.trim()==="" ? false : b.name.toLowerCase().includes(q.toLowerCase()))
//   ).slice(0,8);                         // cap results

//   /* ───── UI ───── */
//   return (
//     <Modal open={open} onClose={onClose} title="Choose Behaviours">
//       {/* combobox */}
//       <div className="relative" ref={boxRef}>
//         <input
//           value={q}
//           onChange={e=>{setQ(e.target.value); setShow(true);}}
//           onFocus={()=>setShow(true)}
//           placeholder="Type to search behaviours…"
//           className="w-full mb-4 px-3 py-2 border rounded-md outline-none
//                      focus:ring-2 focus:ring-primary"
//           onKeyDown={e=>{
//             if(e.key==="ArrowDown" && filtered[0]){ e.preventDefault(); document.getElementById("beh-0")?.focus(); }
//             if(e.key==="Enter" && filtered.length){ add(filtered[0]); setQ(""); setShow(false); }
//           }}
//         />

//         {show && filtered.length>0 && (
//           <ul className="absolute top-full left-0 w-full bg-white border rounded shadow-lg
//                          max-h-56 overflow-y-auto z-50">
//             {filtered.map((b,i)=>(
//               <li key={b._id}
//                   id={`beh-${i}`}
//                   tabIndex={0}
//                   onClick={()=>{ add(b); setQ(""); setShow(false); }}
//                   onKeyDown={e=>{
//                     if(e.key==="Enter"){ add(b); setQ(""); setShow(false); }
//                     if(e.key==="ArrowDown") document.getElementById(`beh-${i+1}`)?.focus();
//                     if(e.key==="ArrowUp")   (i?document.getElementById(`beh-${i-1}`):null)?.focus();
//                   }}
//                   className="px-4 py-2 hover:bg-primary/10 cursor-pointer focus:bg-primary/10 outline-none">
//                 {b.name}
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>

//       {/* chips */}
//       {sel.size>0 && (
//         <div className="flex flex-wrap gap-2 mb-5">
//           {Array.from(sel).map(([id,name])=>(
//             <span key={id}
//                   className="flex items-center gap-1 px-3 py-1 bg-primary/10
//                              text-primary rounded-full text-sm">
//               {name}
//               <X className="w-4 h-4 cursor-pointer" onClick={()=>remove(id)}/>
//             </span>
//           ))}
//         </div>
//       )}

//       {/* footer */}
//       <div className="flex justify-end gap-2 pt-4">
//         <button onClick={onClose}
//                 className="px-4 py-2 rounded border border-primary text-primary">
//           Cancel
//         </button>
//         <button onClick={save}
//                 className="px-6 py-2 rounded bg-primary text-white disabled:opacity-40"
//                 disabled={sel.size===0}>
//           Save
//         </button>
//       </div>
//     </Modal>
//   );
// }
