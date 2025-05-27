import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import { Input } from '../components/Input';
import { getProfile, patchProfile, patchPassword } from '../services/api';

export default function EditProfileModal({ open, onClose }) {
  const [me, setMe] = useState({ name:'', email:'', avatarUrl:'' });
  const [file, setFile] = useState(null);
  const [pwd, setPwd] = useState({ old:'', _new:'', confirm:'' });
  const [tab, setTab] = useState('info');   // 'info' | 'password'

  useEffect(()=>{
    if (open) getProfile().then(r=>setMe(r.data));
  },[open]);

  const saveInfo = async e => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', me.name);
    fd.append('email', me.email);
    if (file) fd.append('avatar', file);
    await patchProfile(fd); 
    onClose();
    window.location.reload();   // quick refresh for navbar avatar
  };

  const changePwd = async e => {
    e.preventDefault();
    if (pwd._new !== pwd.confirm) return alert('Passwords must match');
    await patchPassword({ oldPassword: pwd.old, newPassword: pwd._new });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="My Profile">
      <div className="flex gap-4 mb-4">
        <button onClick={()=>setTab('info')}     className={tab==='info'?'font-medium':''}>Details</button>
        <button onClick={()=>setTab('password')} className={tab==='password'?'font-medium':''}>Password</button>
      </div>

      {tab==='info' ? (
        <form onSubmit={saveInfo} className="space-y-4">
          <input type="file" accept="image/*"
            onChange={e=>setFile(e.target.files[0])}
            className="border w-full p-2 rounded"/>

          <Input label="Name"  value={me.name}  onChange={e=>setMe({...me,name:e.target.value})}/>
          <Input label="Email" value={me.email} onChange={e=>setMe({...me,email:e.target.value})}/>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl border border-primary text-primary">Cancel</button>
            <button className="px-6 py-2 rounded-xl bg-primary text-white">Save</button>
          </div>
        </form>
      ) : (
        <form onSubmit={changePwd} className="space-y-4">
          <Input label="Current Password" type="password" value={pwd.old} onChange={e=>setPwd({...pwd,old:e.target.value})}/>
          <Input label="New Password"     type="password" value={pwd._new} onChange={e=>setPwd({...pwd,_new:e.target.value})}/>
          <Input label="Confirm Password" type="password" value={pwd.confirm} onChange={e=>setPwd({...pwd,confirm:e.target.value})}/>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl border border-primary text-primary">Cancel</button>
            <button className="px-6 py-2 rounded-xl bg-primary text-white">Change</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
