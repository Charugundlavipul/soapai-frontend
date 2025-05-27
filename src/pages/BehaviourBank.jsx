import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { getBehaviours, postBehaviour, deleteBehaviour } from '../services/api';
import BehaviourModal from '../modals/BehaviourModal';
import { ChevronDownIcon, TrashIcon } from '@heroicons/react/24/solid';

export default function BehaviourBank(){
  const [list,setList]=useState([]);
  const [show,setShow]=useState(false);

  useEffect(()=>{ getBehaviours().then(r=>setList(r.data)); },[]);

  const add=b=>setList(p=>[b,...p]);
  const del=async id=>{
    await deleteBehaviour(id);
    setList(p=>p.filter(x=>x._id!==id));
  };

  return(
    <div className="min-h-screen flex">
      <Sidebar/>
      <div className="flex-1 flex flex-col">
        <Navbar/>
        <main className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-primary">Behaviour Bank</h2>
            <button onClick={()=>setShow(true)}
              className="px-4 py-2 rounded-xl bg-primary text-white">
              + New Behaviour
            </button>
          </div>

          {/* list */}
          {list.map(b=>(
            <BehaviourCard key={b._id} b={b} onDelete={()=>del(b._id)}/>
          ))}
        </main>
      </div>

      <BehaviourModal
        open={show}
        onClose={()=>setShow(false)}
        onSaved={add}
      />
    </div>
  );
}

/* collapsible card */
function BehaviourCard({ b, onDelete }){
  const [open,setOpen]=useState(false);
  return(
    <div className="border rounded-xl p-4 space-y-2">
      <div className="flex justify-between items-center cursor-pointer" onClick={()=>setOpen(o=>!o)}>
        <p className="font-medium">{b.name}</p>
        <ChevronDownIcon className={`h-4 w-4 transition ${open?'rotate-180':''}`}/>
      </div>
      {open&&(
        <>
          <p className="text-sm text-gray-600">{b.description||'—'}</p>
          <button onClick={onDelete}
            className="flex items-center gap-1 text-sm text-red-500 hover:underline">
            <TrashIcon className="h-4 w-4"/> Delete
          </button>
        </>
      )}
    </div>
  );
}
