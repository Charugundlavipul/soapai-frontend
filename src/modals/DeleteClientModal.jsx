import ConfirmModal from '../components/ConfirmModal';
import api from '../services/api';

export default function DeleteClientModal({ open, onClose, client, onDeleted }) {
  const del = async () => {
    await api.delete(`/clients/${client._id}`);
    onDeleted(client);
    onClose();
  };
  return (
    <ConfirmModal
      open={open}
      title="Delete Client"
      message={`Are you sure you want to delete ${client?.name}?`}
      onCancel={onClose}
      onConfirm={del}
    />
  );
}
