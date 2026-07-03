const statusStyles = {
  submitted:     'bg-surface-container text-status-gray',
  under_review:  'bg-blue-50 text-status-blue',
  assigned:      'bg-[#eef2ff] text-[#4338ca]',
  investigating: 'bg-amber-50 text-status-amber',
  resolved:      'bg-green-50 text-status-green',
  closed:        'bg-surface-container text-status-gray',
};

const priorityStyles = {
  normal: 'bg-surface-container text-status-gray',
  high:   'bg-orange-50 text-status-orange',
  urgent: 'bg-red-50 text-status-red',
};

const statusLabels = {
  submitted:     'Submitted',
  under_review:  'Under Review',
  assigned:      'Assigned',
  investigating: 'Investigating',
  resolved:      'Resolved',
  closed:        'Closed',
};

const priorityLabels = {
  normal: 'Normal',
  high:   'High',
  urgent: 'Urgent',
};

export default function Badge({ variant, type = 'status', children }) {
  const styles = type === 'priority' ? priorityStyles : statusStyles;
  const labels = type === 'priority' ? priorityLabels : statusLabels;
  const cls = styles[variant] || 'bg-surface-container text-status-gray';
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full font-label-sm text-label-sm ${cls}`}>
      {children || labels[variant] || variant}
    </span>
  );
}
