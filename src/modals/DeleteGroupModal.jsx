import ConfirmModal from "../components/ConfirmModal";
import api from "../services/api";

export default function DeleteGroupModal({ open, onClose, group, onDeleted }) {
  const del = async () => {
    await api.delete(`/groups/${group._id}`);   // backend also wipes appointments
    onDeleted(group);                           // Dashboard now drops them from state
    onClose();
  };

  return (
    <ConfirmModal
      open={open}
      title="Delete Group"
      message={`Delete "${group?.name}" and ALL of its appointments?`}
      onCancel={onClose}
      onConfirm={del}
    />
  );
}
