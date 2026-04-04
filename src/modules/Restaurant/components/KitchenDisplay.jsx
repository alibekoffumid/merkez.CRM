import React, { useState } from 'react';
import { Clock, ChefHat, CheckCircle2, ArrowRight, Martini } from 'lucide-react';

// Mock initial data split by station (Kitchen vs Bar)
const initialTickets = [
  {
    id: 'K-0921',
    table: 'Table T2',
    timeElapsed: '12m',
    status: 'NEW', // NEW, PREPARING, READY
    station: 'kitchen',
    items: [
      { name: 'Margherita Pizza', qty: 2, notes: 'No extra cheese' },
      { name: 'Caesar Salad', qty: 1, notes: '' }
    ]
  },
  {
    id: 'B-0921',
    table: 'Table T2',
    timeElapsed: '12m',
    status: 'NEW',
    station: 'bar',
    items: [
      { name: 'Mojito', qty: 2, notes: 'Less ice' }
    ]
  },
  {
    id: 'K-0922',
    table: 'Table T5',
    timeElapsed: '5m',
    status: 'NEW',
    station: 'kitchen',
    items: [
      { name: 'Grilled Salmon', qty: 1, notes: 'Well done' }
    ]
  },
  {
    id: 'B-0922',
    table: 'Table T5',
    timeElapsed: '6m',
    status: 'NEW',
    station: 'bar',
    items: [
      { name: 'Espresso', qty: 2, notes: '' },
      { name: 'Sparkling Water', qty: 1, notes: '' }
    ]
  },
  {
    id: 'K-0918',
    table: 'VIP Cabin V1',
    timeElapsed: '18m',
    status: 'PREPARING',
    station: 'kitchen',
    items: [
      { name: 'Tiramisu', qty: 4, notes: '' }
    ]
  },
  {
    id: 'B-0918',
    table: 'VIP Cabin V1',
    timeElapsed: '19m',
    status: 'READY',
    station: 'bar',
    items: [
      { name: 'Black Coffee', qty: 4, notes: '' },
      { name: 'Fresh Orange Juice', qty: 2, notes: '' }
    ]
  },
  {
    id: 'K-0915',
    table: 'Table T6',
    timeElapsed: '25m',
    status: 'READY',
    station: 'kitchen',
    items: [
      { name: 'Steak Frites', qty: 2, notes: 'Medium Rare' }
    ]
  },
  {
    id: 'B-0915',
    table: 'Table T6',
    timeElapsed: '26m',
    status: 'READY',
    station: 'bar',
    items: [
      { name: 'Coca Cola', qty: 2, notes: 'No ice' }
    ]
  }
];

const KitchenDisplay = () => {
  const [tickets, setTickets] = useState(initialTickets);
  const [activeStation, setActiveStation] = useState('kitchen'); // 'kitchen' or 'bar'

  const moveOrder = (id, newStatus) => {
    setTickets(tickets.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const getStationParams = () => {
    return activeStation === 'kitchen' 
      ? { icon: <ChefHat className="w-5 h-5 mr-2 text-merkez-blue" />, title: 'Kitchen Display System', color: 'blue' }
      : { icon: <Martini className="w-5 h-5 mr-2 text-purple-500" />, title: 'Bar Display System', color: 'purple' };
  };

  const { icon, title } = getStationParams();

  // Filter based on currently active station
  const stationTickets = tickets.filter(t => t.station === activeStation);
  const getColumnData = (status) => stationTickets.filter(t => t.status === status);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            {icon}
            {title}
          </h2>
          <p className="text-sm text-gray-500">Manage incoming tickets and track preparation times.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {/* Station Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
             <button
               onClick={() => setActiveStation('kitchen')}
               className={`px-6 py-1.5 rounded-md text-sm font-bold transition-all shadow-sm flex items-center ${
                 activeStation === 'kitchen' ? 'bg-white text-merkez-blue' : 'text-gray-500 shadow-none hover:text-gray-700'
               }`}
             >
               <ChefHat className="w-4 h-4 mr-2"/>
               Kitchen
             </button>
             <button
               onClick={() => setActiveStation('bar')}
               className={`px-6 py-1.5 rounded-md text-sm font-bold transition-all shadow-sm flex items-center ${
                 activeStation === 'bar' ? 'bg-white text-purple-600' : 'text-gray-500 shadow-none hover:text-gray-700'
               }`}
             >
               <Martini className="w-4 h-4 mr-2"/>
               Bar
             </button>
          </div>

          <div className="flex gap-3">
            <div className="text-center px-4 py-1.5 bg-red-50 rounded-lg border border-red-100 min-w-[70px]">
              <span className="block text-xl font-bold text-red-600">{getColumnData('NEW').length}</span>
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">New</span>
            </div>
            <div className="text-center px-4 py-1.5 bg-yellow-50 rounded-lg border border-yellow-100 min-w-[70px]">
              <span className="block text-xl font-bold text-yellow-600">{getColumnData('PREPARING').length}</span>
              <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">Preparing</span>
            </div>
            <div className="text-center px-4 py-1.5 bg-green-50 rounded-lg border border-green-100 min-w-[70px]">
              <span className="block text-xl font-bold text-green-600">{getColumnData('READY').length}</span>
              <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Ready</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        
        {/* NEW COLUMN */}
        <div className="flex flex-col bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shadow-inner">
          <div className="p-4 bg-red-500 text-white font-bold flex justify-between items-center shadow-sm z-10">
            <span>🔴 New Tickets</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{getColumnData('NEW').length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {getColumnData('NEW').map(ticket => (
              <TicketCard 
                 key={ticket.id} 
                 ticket={ticket} 
                 actionBtn={<ActionBtn onClick={() => moveOrder(ticket.id, 'PREPARING')} text="Start Preparing" color="bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500" />}
              />
            ))}
            {getColumnData('NEW').length === 0 && (
              <p className="text-center text-gray-400 font-medium text-sm mt-8">No new tickets.</p>
            )}
          </div>
        </div>

        {/* PREPARING COLUMN */}
        <div className="flex flex-col bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shadow-inner">
          <div className="p-4 bg-yellow-500 text-white font-bold flex justify-between items-center shadow-sm z-10">
            <span>🟡 Preparing</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{getColumnData('PREPARING').length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {getColumnData('PREPARING').map(ticket => (
              <TicketCard 
                 key={ticket.id} 
                 ticket={ticket} 
                 actionBtn={<ActionBtn onClick={() => moveOrder(ticket.id, 'READY')} text="Mark as Ready" color="bg-green-500 hover:bg-green-600 focus:ring-green-500" />}
              />
            ))}
            {getColumnData('PREPARING').length === 0 && (
              <p className="text-center text-gray-400 font-medium text-sm mt-8">No tickets in preparation.</p>
            )}
          </div>
        </div>

        {/* READY COLUMN */}
        <div className="flex flex-col bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shadow-inner">
          <div className="p-4 bg-green-500 text-white font-bold flex justify-between items-center shadow-sm z-10">
            <span>🟢 Ready for Pickup</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{getColumnData('READY').length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {getColumnData('READY').map(ticket => (
              <TicketCard 
                 key={ticket.id} 
                 ticket={ticket} 
                 actionBtn={<ActionBtn onClick={() => moveOrder(ticket.id, 'NEW')} text="Archived (Done)" disabled={true} color="bg-gray-300 cursor-not-allowed" />}
              />
            ))}
            {getColumnData('READY').length === 0 && (
              <p className="text-center text-gray-400 font-medium text-sm mt-8">No tickets waiting for pickup.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

const TicketCard = ({ ticket, actionBtn }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
        <div>
          <span className="font-bold text-gray-900 text-sm block">{ticket.table}</span>
          <span className="text-[10px] text-gray-500 font-medium tracking-wide">#{ticket.id}</span>
        </div>
        <div className="flex items-center text-red-500 font-bold text-xs bg-red-50 px-2 py-1 rounded-md">
          <Clock className="w-3 h-3 mr-1" /> {ticket.timeElapsed}
        </div>
      </div>
      <div className="p-4">
        <ul className="space-y-3">
          {ticket.items.map((item, i) => (
            <li key={i} className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  <span className={`${ticket.station === 'kitchen' ? 'text-merkez-blue' : 'text-purple-600'} mr-1.5`}>{item.qty}x</span> 
                  {item.name}
                </p>
                {item.notes && (
                  <p className="text-[11px] text-orange-600 font-medium mt-0.5 bg-orange-50 px-1 py-0.5 rounded inline-block">
                    Note: {item.notes}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-3 pt-0">
        {actionBtn}
      </div>
    </div>
  );
};

const ActionBtn = ({ onClick, text, color, disabled }) => (
  <button 
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    className={`w-full py-2 rounded-lg text-sm font-bold text-white shadow-sm flex items-center justify-center transition-colors ${color}`}
  >
    {text} {disabled ? <CheckCircle2 className="w-4 h-4 ml-2" /> : <ArrowRight className="w-4 h-4 ml-2" />}
  </button>
);

export default KitchenDisplay;
