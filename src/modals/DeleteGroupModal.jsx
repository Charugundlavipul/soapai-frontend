import ConfirmModal from '../components/ConfirmModal';
import api from '../services/api';

export default function DeleteGroupModal({ open, onClose, group, onDeleted }) {
  const del = async () => {
    await api.delete(`/groups/${group._id}`);
    onDeleted(group);
    onClose();
  };
  return (
    <ConfirmModal
      open={open}
      title="Delete Group"
      message={`Are you sure you want to delete ${group?.name}?`}
      onCancel={onClose}
      onConfirm={del}
    />
  );
}
