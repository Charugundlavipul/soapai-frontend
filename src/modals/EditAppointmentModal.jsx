import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import api from '../services/api';
import { formatISO } from 'date-fns';

export default function EditAppointmentModal({ open, onClose, appt, onUpdated, onDeleted }) {
  const [groups, setGroups]   = useState([]);
  const [clients,setClients]  = useState([]);
  const [form, setForm] = useState({});

  useEffect(()=>{
    if(open){
      api.get('/groups').then(r=>setGroups(r.data));
      api.get('/clients').then(r=>setClients(r.data));
      setForm({
        type: appt.type,
        group: appt.group?._id || '',
        patient: appt.patient?._id || '',
        dateTimeStart: formatISO(new Date(appt.dateTimeStart)).slice(0,16),
        dateTimeEnd:   formatISO(new Date(appt.dateTimeEnd)).slice(0,16)
      });
    }
  },[open]);

  const change=e=>setForm(f=>({...f,[e.target.name]:e.target.value}));

  const save = async e => {
    e.preventDefault();
    const payload = {
      type: form.type,
      dateTimeStart: new Date(form.dateTimeStart),
      dateTimeEnd:   new Date(form.dateTimeEnd)
    };
    if (form.type === 'group')      payload.group   = form.group;
    if (form.type === 'individual') payload.patient = form.patient;

    const { data } = await api.patch(`/appointments/${appt._id}`, payload);
    onUpdated(data);
    onClose();
  };

  const del=async()=>{
    await api.delete(`/appointments/${appt._id}`);
    onDeleted(appt);
    onClose();
  };

  return(
    <Modal open={open} onClose={onClose} title="Edit Appointment">
      <form onSubmit={save} className="space-y-4">
        <select name="type" value={form.type} onChange={change}
                className="w-full border rounded-xl p-2">
          <option value="individual">Individual</option>
          <option value="group">Group</option>
        </select>

        {form.type==='group' ? (
          <select name="group" value={form.group} onChange={change}
                  className="w-full border rounded-xl p-2">
            <option value="">-- select group --</option>
            {groups.map(g=><option key={g._id} value={g._id}>{g.name}</option>)}
          </select>
        ):(
          <select name="patient" value={form.patient} onChange={change}
                  className="w-full border rounded-xl p-2">
            <option value="">-- select patient --</option>
            {clients.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        )}

        <input type="datetime-local" name="dateTimeStart"
               value={form.dateTimeStart} onChange={change}
               className="w-full border rounded-xl p-2"/>
        <input type="datetime-local" name="dateTimeEnd"
               value={form.dateTimeEnd} onChange={change}
               className="w-full border rounded-xl p-2"/>

        <div className="flex justify-between pt-2">
          <button type="button" onClick={del}
                  className="px-4 py-2 rounded-xl border border-red-500 text-red-500">
            Delete
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-primary text-primary">Cancel</button>
            <button className="px-6 py-2 rounded-xl bg-primary text-white">Save</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
