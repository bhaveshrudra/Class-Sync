import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AcademicEvent } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

type EventCreateInput = Omit<AcademicEvent, 'id' | 'created_at' | 'updated_at' | 'created_by'>;
type EventUpdateInput = Partial<Omit<AcademicEvent, 'id' | 'created_by' | 'created_at' | 'updated_at'>>;

interface EventsContextType {
  events: AcademicEvent[];
  loading: boolean;
  error: string | null;
  addEvent: (eventData: EventCreateInput) => Promise<AcademicEvent | null>;
  updateEvent: (id: string, updates: EventUpdateInput) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
  toggleEventActive: (id: string) => Promise<boolean>;
  getEventById: (id: string) => AcademicEvent | undefined;
  refreshEvents: () => Promise<void>;
  resetToDefaultEvents: () => Promise<void>;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

const FRIENDLY_DEFAULT_ERROR = 'Unable to complete the request right now. Please try again.';

const getFriendlySupabaseError = (operation: string): string => {
  switch (operation) {
    case 'load':
      return 'Could not load academic events right now.';
    case 'create':
      return 'Could not create the event. Please check your permissions and try again.';
    case 'update':
      return 'Could not update the event. Please try again.';
    case 'delete':
      return 'Could not delete the event. Please try again.';
    case 'toggle':
      return 'Could not update event status. Please try again.';
    default:
      return FRIENDLY_DEFAULT_ERROR;
  }
};

export const EventsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshEvents = async (): Promise<void> => {
    if (!user) {
      setEvents([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: loadError } = await supabase
      .from('academic_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (loadError) {
      console.error('Failed to load events:', loadError);
      setEvents([]);
      setError(getFriendlySupabaseError('load'));
      setLoading(false);
      return;
    }

    setEvents((data ?? []) as AcademicEvent[]);
    setLoading(false);
  };

  useEffect(() => {
    refreshEvents();
  }, [user?.id]);

  const addEvent = async (eventData: EventCreateInput): Promise<AcademicEvent | null> => {
    if (!user) {
      setError('You must be logged in to create an event.');
      return null;
    }

    setError(null);

    const { data, error: insertError } = await supabase
      .from('academic_events')
      .insert({
        ...eventData,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Failed to create event:', insertError);
      setError(getFriendlySupabaseError('create'));
      return null;
    }

    const created = data as AcademicEvent;
    setEvents((prev) => [created, ...prev]);
    return created;
  };

  const updateEvent = async (id: string, updates: EventUpdateInput): Promise<boolean> => {
    setError(null);

    const { data, error: updateError } = await supabase
      .from('academic_events')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Failed to update event:', updateError);
      setError(getFriendlySupabaseError('update'));
      return false;
    }

    const updated = data as AcademicEvent;
    setEvents((prev) => prev.map((evt) => (evt.id === id ? updated : evt)));
    return true;
  };

  const deleteEvent = async (id: string): Promise<boolean> => {
    setError(null);

    const { data, error: deleteError } = await supabase
      .from('academic_events')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (deleteError) {
      console.error('Failed to delete event:', deleteError);
      setError(getFriendlySupabaseError('delete'));
      return false;
    }

    if (!data) {
      setError(getFriendlySupabaseError('delete'));
      return false;
    }

    setEvents((prev) => prev.filter((evt) => evt.id !== id));
    return true;
  };

  const toggleEventActive = async (id: string): Promise<boolean> => {
    const currentEvent = events.find((evt) => evt.id === id);
    if (!currentEvent) {
      setError(getFriendlySupabaseError('toggle'));
      return false;
    }

    setError(null);

    const { data, error: toggleError } = await supabase
      .from('academic_events')
      .update({ is_active: !currentEvent.is_active })
      .eq('id', id)
      .select('*')
      .single();

    if (toggleError) {
      console.error('Failed to toggle event status:', toggleError);
      setError(getFriendlySupabaseError('toggle'));
      return false;
    }

    const updated = data as AcademicEvent;
    setEvents((prev) => prev.map((evt) => (evt.id === id ? updated : evt)));
    return true;
  };

  const getEventById = (id: string): AcademicEvent | undefined => {
    return events.find((evt) => evt.id === id);
  };

  const resetToDefaultEvents = async () => {
    await refreshEvents();
  };

  return (
    <EventsContext.Provider
      value={{
        events,
        loading,
        error,
        addEvent,
        updateEvent,
        deleteEvent,
        toggleEventActive,
        getEventById,
        refreshEvents,
        resetToDefaultEvents,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
};

export const useEvents = (): EventsContextType => {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
};
