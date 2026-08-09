import React, { useState } from 'react';

interface CustomCalendarPickerProps {
  selectedDate: string; // ISO 'YYYY-MM-DD'
  onSelectDate: (dateStr: string) => void;
  onClose?: () => void;
}

export const CustomCalendarPicker: React.FC<CustomCalendarPickerProps> = ({
  selectedDate,
  onSelectDate,
  onClose,
}) => {
  // Parse initial selected date or default to current date
  const initialDateObj = selectedDate ? new Date(selectedDate) : new Date();
  const validInitialDate = isNaN(initialDateObj.getTime()) ? new Date() : initialDateObj;

  const [currentYear, setCurrentYear] = useState(validInitialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(validInitialDate.getMonth()); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleSetToday = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    setCurrentYear(yyyy);
    setCurrentMonth(today.getMonth());
    onSelectDate(todayStr);
    if (onClose) onClose();
  };

  // Days in month calculation
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const formattedSelectedDate = selectedDate || `${validInitialDate.getFullYear()}-${String(validInitialDate.getMonth() + 1).padStart(2, '0')}-${String(validInitialDate.getDate()).padStart(2, '0')}`;

  const dayCells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    dayCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    dayCells.push(day);
  }

  const handleSelectDay = (day: number) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const fullStr = `${currentYear}-${mm}-${dd}`;
    onSelectDate(fullStr);
    if (onClose) onClose();
  };

  return (
    <div
      style={{
        width: '290px',
        background: '#ffffff',
        borderRadius: '20px',
        border: '1.5px solid #fef08a',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.12)',
        padding: '1.1rem',
        fontFamily: "'Inter', 'Outfit', sans-serif",
        userSelect: 'none',
        position: 'relative',
        zIndex: 9999,
      }}
    >
      {/* Header Month/Year + Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
        <button
          type="button"
          onClick={handlePrevMonth}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: '#fef3c7',
            border: 'none',
            color: '#b45309',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          &lt;
        </button>

        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
          {monthNames[currentMonth]} {currentYear}
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: '#fef3c7',
            border: 'none',
            color: '#b45309',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          &gt;
        </button>
      </div>

      {/* Weekday Headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '0.6rem' }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} style={{ fontSize: '0.78rem', fontWeight: 700, color: '#808ea3' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '1.1rem' }}>
        {dayCells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }

          const mm = String(currentMonth + 1).padStart(2, '0');
          const dd = String(day).padStart(2, '0');
          const dateCandidate = `${currentYear}-${mm}-${dd}`;
          const isSelected = formattedSelectedDate === dateCandidate;

          return (
            <button
              key={`day-${day}`}
              type="button"
              onClick={() => handleSelectDay(day)}
              style={{
                width: '32px',
                height: '34px',
                margin: '0 auto',
                borderRadius: '10px',
                border: 'none',
                background: isSelected ? '#d97706' : 'transparent',
                color: isSelected ? '#ffffff' : '#334155',
                fontWeight: isSelected ? 800 : 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isSelected ? '0 4px 10px rgba(217, 119, 6, 0.35)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Footer Bar: Set Today & Selected Label */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleSetToday}
          style={{
            padding: '6px 14px',
            borderRadius: '10px',
            background: '#fef3c7',
            border: 'none',
            color: '#b45309',
            fontWeight: 800,
            fontSize: '0.78rem',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(180, 83, 9, 0.1)',
          }}
        >
          Set Today
        </button>

        <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700 }}>
          Selected: <span style={{ color: '#0f172a', fontWeight: 800 }}>{formattedSelectedDate}</span>
        </div>
      </div>
    </div>
  );
};
