import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import { Select } from '../components/Select';
import api from '../services/api';
import { formatISO } from 'date-fns';

export default function NewAppointmentModal({ open, onClose, onCreated }) {
  const [type, setType] = useState('group');
  const [clients, setClients] = useState([]);
  const [groups,  setGroups]  = useState([]);
  const [selection,setSelection]=useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end,   setEnd]   = useState('');
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(()=>{
    if (open) {
      api.get('/clients').then(r=>setClients(r.data));
      api.get('/groups').then(r=>setGroups(r.data));
    }
  },[open]);

  const validateDateTime = () => {
    if (!date || !start || !end) {return true;} // Skip validation if not all fields are set

    const now = new Date();
    //console.log('Validating appointment date/time:', { date, start, end });

    const appointmentStart = new Date(`${date} ${start}`);
    const appointmentEnd = new Date(`${date} ${end}`);

    // Check if the appointment date/time is in the past
    if (appointmentStart <= now) {
      setErrorMessage("Cannot schedule appointments in the past.");
      setShowErrorPopup(true);
      return false;
    }

    // Check if start time is after or equal to end time
    if (appointmentStart >= appointmentEnd) {
      if (appointmentStart.getTime() === appointmentEnd.getTime()) {
        setErrorMessage("Start time and end time cannot be the same.");
      } else {
        setErrorMessage("Start time cannot be after end time.");
      }
      setShowErrorPopup(true);
      return false;
    }

    return true;
  };

  const submit = async e => {
    e.preventDefault();

    if (!validateDateTime()) {return;}//write backend node code to check too

    const payload = {
      type,
      dateTimeStart: formatISO(new Date(`${date} ${start}`)),
      dateTimeEnd:   formatISO(new Date(`${date} ${end}`))
    };
    if (type==='group')     payload.group   = selection;
    if (type==='individual')payload.patient = selection;

    try{
      const { data } = await api.post('/appointments', payload);
      onCreated(data);
      onClose();
    }
    catch (error) {
      console.error('Error creating appointment:', error);
        setErrorMessage('Failed to create appointment try again later.');
        setShowErrorPopup(true);
    }
  };

  const handleTimeChange = (timeType, value) => {
    if (timeType === 'start') {
      setStart(value);
    } else {
      setEnd(value);
    }

    // Clear any existing error when user changes time
    if (showErrorPopup) {
      setShowErrorPopup(false);
    }
  };

  const handleDateChange = (value) => {
    setDate(value);
    // Clear any existing error when user changes date
    if (showErrorPopup) {
      setShowErrorPopup(false);
    }
  };

  const closeErrorPopup = () => {
    setShowErrorPopup(false);
    setErrorMessage('');
    // Clear the time inputs when popup closes
    setStart('');
    setEnd('');
    // setDate('');//idk if we want to clear date
  };



  ////TODO: Rances add custom date picker component to match design better

  return (
    <Modal open={open} onClose={onClose} title="New Appointment">
      <form onSubmit={submit} className="space-y-4">
        {/* Visit type toggle */}
        <div className="flex gap-2">
          {['group','individual'].map(v=>(
            <button key={v} type="button"
              onClick={()=>setType(v)}
              className={`flex-1 py-2 rounded-xl border
                          ${type===v
                            ? 'bg-primary text-white border-primary'
                            : 'bg-gray-100'}`}>
              {v.charAt(0).toUpperCase()+v.slice(1)}
            </button>
          ))}
        </div>

        <Select label={type==='group' ? 'Group' : 'Patient'}
                value={selection} onChange={e=>setSelection(e.target.value)} required>
          <option value="">Select…</option>
          {(type==='group'?groups:clients).map(o=>
            <option key={o._id} value={o._id}>{o.name}</option>
          )}
        </Select>

        <input type="date" value={date} onChange={e=>handleDateChange(e.target.value)}
               className="w-full px-4 py-2 bg-gray-100 rounded-xl" required/>

        <div className="flex gap-2">
          <input type="time" value={start} onChange={e=>handleTimeChange('start', e.target.value)}
                 className="flex-1 px-4 py-2 bg-gray-100 rounded-xl" required/>
          <input type="time" value={end} onChange={e=>handleTimeChange('end', e.target.value)}
                 className="flex-1 px-4 py-2 bg-gray-100 rounded-xl" required/>
        </div>


        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-primary text-primary">Cancel</button>
          <button className="px-6 py-2 rounded-xl bg-primary text-white">Confirm</button>
        </div>


        <Modal open={showErrorPopup} onClose={closeErrorPopup} title="Invalid Time">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Time Validation Error</h3>
                <p className="text-gray-600">{errorMessage}</p>
              </div>

            </div>
            <div className="flex justify-end">
              <button onClick={closeErrorPopup} className="px-4 py-2 rounded-xl bg-primary text-white">
                OK
              </button>
            </div>
          </div>
        </Modal>

      </form>
    </Modal>
  );
}
