// client/src/modals/DeleteGroupModal.jsx
import ConfirmModal from "../components/ConfirmModal";
import api          from "../services/api";

/**
 * DeleteGroupModal
 * ────────────────────────────────────────────────────────────────
 * Props
 * ▸ open           : boolean
 * ▸ appt           : the full Appointment object whose card the user clicked
 * ▸ onClose        : () => void                – hide the modal
 * ▸ onDeleted      : (groupObj) => void        – called if user deletes ALL
 * ▸ onApptDeleted  : (apptObj)  => void        – called if user deletes ONE
 */
export default function DeleteGroupModal({
  open,
  appt,
  onClose,
  onDeleted,
  onApptDeleted,
}) {
  /* safety-guard – nothing to show if we don’t have an appointment */
  if (!appt) return null;

  /* ------------------------------------------------------------ */
  /* single-appointment delete                                    */
  /* ------------------------------------------------------------ */
  const deleteThisAppointment = async () => {
    try {
      await api.delete(`/appointments/${appt._id}`);
      onApptDeleted?.(appt);
    } finally {
      onClose();
    }
  };

  /* ------------------------------------------------------------ */
  /* delete ENTIRE group (all its appointments)                   */
  /* ------------------------------------------------------------ */
  const deleteAllAppointments = async () => {
    try {
      await api.delete(`/groups/${appt.group._id}`);
      onDeleted?.(appt.group);
    } finally {
      onClose();
    }
  };

  /* ------------------------------------------------------------ */
  /* render modal – uses the revised ConfirmModal that supports   */
  /* multiple action buttons.                                     */
  /* ------------------------------------------------------------ */
  return (
    <ConfirmModal
      open={open}
      title="Delete Group Session"
      message={`“${appt.group.name}” currently contains this appointment.\n\nWhat would you like to delete?`}
      onCancel={onClose}
      actions={[
        {
          label   : "Delete This Appointment",
          onClick : deleteThisAppointment,
          variant : "danger-outline",          // grey border / red text
        },
        {
          label   : "Delete ALL Appointments",
          onClick : deleteAllAppointments,
          variant : "danger",                  // solid red button
        },
      ]}
    />
  );
}
