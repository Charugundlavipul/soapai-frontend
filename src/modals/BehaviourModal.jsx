import { useState } from 'react';
import Modal from '../components/Modal';
import { postBehaviour } from '../services/api';

export default function BehaviourModal({ open, onClose, onSaved }){
  const [form,setForm]=useState({name:'',description:''});

  const submit=async e=>{
    e.preventDefault();
    const { data } = await postBehaviour(form);
    onSaved(data);
    onClose();
    setForm({name:'',description:''});
  };

  return(
    <Modal open={open} onClose={onClose} title="Create New Behaviour">
      <form onSubmit={submit} className="space-y-4">
        <input
          required
          placeholder="Behaviour Name"
          value={form.name}
          onChange={e=>setForm(f=>({...f,name:e.target.value}))}
          className="w-full border rounded-xl px-4 py-2"
        />
        <textarea
          placeholder="Behaviour Description"
          value={form.description}
          onChange={e=>setForm(f=>({...f,description:e.target.value}))}
          className="w-full border rounded-xl px-4 py-2 h-28 resize-none"
        />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl border border-primary text-primary">
            Cancel
          </button>
          <button
            className="px-6 py-2 rounded-xl bg-primary text-white">
            Save Behaviour
          </button>
        </div>
      </form>
    </Modal>
  );
}
