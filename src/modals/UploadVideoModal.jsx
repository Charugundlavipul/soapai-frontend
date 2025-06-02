import { useState } from 'react';
import Modal from '../components/Modal';
import BehaviourSelect from '../components/BehaviourSelect';
import { uploadVideo } from '../services/api';

export default function UploadVideoModal({ open, onClose, appointment }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [behavs, setBehavs] = useState([]);

  if (!appointment) return null;   // safety

  const save = async e => {
    e.preventDefault();
    if (!file) return alert('Please choose a video');
    const fd = new FormData();
    fd.append('title', title || 'Session video');
    fd.append('notes', notes);
    behavs.forEach(b => fd.append('behaviours', b._id));
    fd.append('video', file);

    await uploadVideo(appointment._id, fd);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload Your Video">
      <form onSubmit={save} className="grid lg:grid-cols-2 gap-6">
        {/* left column */}
        <div className="space-y-4">
          <input
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border rounded-xl px-4 py-2"
          />

          {/* Visit type / group / patient (read-only) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Visit Type</label>
              <p className="border rounded-xl px-4 py-2 bg-gray-50 text-sm">
                {appointment.type}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {appointment.type === 'group' ? 'Group' : 'Patient'}
              </label>
              <p className="border rounded-xl px-4 py-2 bg-gray-50 text-sm">
                {appointment.type === 'group'
                  ? appointment.group?.name
                  : appointment.patient?.name}
              </p>
            </div>
          </div>

          {/* behaviour select */}
          <BehaviourSelect value={behavs} onChange={setBehavs} />

          {/* selected behaviours shown inside component */}

          {/* notes */}
          <textarea
            placeholder="Additional Notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full border rounded-xl h-20 resize-none px-4 py-2"
          />
        </div>

        {/* right column – video drop box */}
        <div className="flex flex-col items-center">
          <label
            className="flex-1 w-full border-2 border-dashed rounded-xl flex flex-col
                       justify-center items-center text-sm text-gray-500 cursor-pointer"
          >
            <input
              type="file"
              accept="video/*"
              hidden
              onChange={e => setFile(e.target.files[0])}
            />
            {file ? (
              <p className="p-4">{file.name}</p>
            ) : (
              <p className="p-6 text-center">
                Drag & drop files or <span className="text-primary">Browse</span>
              </p>
            )}
          </label>

          <button
            className="mt-6 px-8 py-2 rounded-xl bg-primary text-white"
          >
            Upload
          </button>
        </div>
      </form>
    </Modal>
  );
}
