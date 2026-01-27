import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Ticket, Key, Loader } from 'lucide-react';
import { Event } from '../../types';
import { api } from '../../services/db';

const Events: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
        try {
            const data = await api.getEvents();
            setEvents(data);
        } catch(e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    loadEvents();
  }, []);

  if (loading) return <div className="flex justify-center p-20"><Loader className="animate-spin text-crimson-600" /></div>;

  return (
    <div>
      <div className="flex justify-between items-end mb-10 border-b border-neutral-800 pb-6">
        <div>
            <h2 className="text-3xl font-serif text-white mb-2">The Dark Room & Events</h2>
            <p className="text-neutral-500 font-sans text-sm">Prenota il tuo spazio privato o unisciti alle notti più esclusive.</p>
        </div>
        <div className="flex gap-2">
             <button className="px-4 py-2 border border-neutral-800 text-neutral-400 hover:text-white hover:border-crimson-900 transition-colors uppercase text-xs tracking-widest">
                Le Mie Prenotazioni
             </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {events.map((event) => (
            <div key={event.id} className="bg-neutral-900 group border border-neutral-800 hover:border-crimson-900/50 transition-all duration-500 overflow-hidden relative">
                <div className="relative h-64 overflow-hidden">
                    <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 filter saturate-50 group-hover:saturate-100" />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent" />
                    <div className="absolute top-4 left-4 bg-black/80 backdrop-blur px-3 py-1 text-[10px] text-crimson-500 border border-crimson-900/30 uppercase tracking-widest font-bold">
                        {event.type.replace('_', ' ')}
                    </div>
                </div>
                
                <div className="p-6 relative">
                    <div className="absolute -top-6 right-6 bg-crimson-900 text-white px-4 py-2 shadow-lg font-serif text-sm">
                        {event.price}
                    </div>

                    <div className="flex items-center gap-2 text-crimson-600 text-xs font-bold uppercase tracking-widest mb-3">
                        <Calendar className="w-3 h-3" />
                        {event.date.includes('T') 
                            ? new Date(event.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) 
                            : event.date}
                    </div>
                    
                    <h3 className="text-2xl font-serif text-white mb-4 group-hover:text-crimson-500 transition-colors">{event.title}</h3>
                    
                    <div className="space-y-3 mb-8">
                        <div className="flex items-center gap-3 text-neutral-400 text-sm">
                            <MapPin className="w-4 h-4 text-neutral-600" /> {event.location}
                        </div>
                        <div className="flex items-center gap-3 text-neutral-400 text-sm">
                            <Users className="w-4 h-4 text-neutral-600" /> {event.attendees} partecipanti
                        </div>
                        {event.description && (
                            <p className="text-xs text-neutral-500 italic border-l-2 border-neutral-700 pl-3 mt-4">
                                "{event.description}"
                            </p>
                        )}
                    </div>

                    <button className="w-full py-3 bg-neutral-950 border border-neutral-800 text-neutral-300 hover:bg-crimson-900 hover:text-white hover:border-crimson-700 transition-all uppercase tracking-widest text-xs font-bold flex items-center justify-center gap-2">
                        {event.type === 'PRIVATE_ROOM' ? <Key className="w-4 h-4"/> : <Ticket className="w-4 h-4" />}
                        {event.type === 'PRIVATE_ROOM' ? 'Prenota Stanza' : 'Mettiti in Lista'}
                    </button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default Events;
