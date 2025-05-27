// src/components/CalendarPanel.jsx
import { useMemo } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, addDays, isSameDay,
         isSameMonth, format } from 'date-fns';

export default function CalendarPanel({ value, onChange }) {
  // value = Date of selected day
  const today = new Date();
  const monthStart = startOfMonth(value);
  const monthEnd   = endOfMonth(value);
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 }); // Mon
  const rows = useMemo(() => {
    let d = gridStart, weeks = [];
    while (d <= monthEnd || weeks.length < 6) {       // 6 rows max
      const days = Array.from({ length: 7 }, () => {
        const day = d;
        d = addDays(d, 1);
        return day;
      });
      weeks.push(days);
    }
    return weeks;
  }, [value]);

  return (
    <div className="border rounded-xl p-4 text-center select-none">
      <p className="font-medium mb-2">
        {format(monthStart, 'MMMM yyyy')}
      </p>
      <div className="grid grid-cols-7 text-xs text-gray-400 mb-1">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>(
          <span key={d}>{d}</span>
        ))}
      </div>
      {rows.map((week,i)=>(
        <div key={i} className="grid grid-cols-7 gap-1 text-xs mb-1">
          {week.map(day=>{
            const inMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, today);
            const isSel   = isSameDay(day, value);
            return (
              <button
                key={day}
                onClick={()=>onChange(day)}
                className={`py-1 rounded
                  ${isSel ? 'bg-primary text-white'
                   : isToday ? 'border border-primary text-primary'
                   : 'hover:bg-primary/10'}
                  ${!inMonth ? 'opacity-30' : ''}`}
              >
                {format(day,'d')}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
