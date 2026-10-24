import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { AcademicEvent } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

type EventCreateInput = Omit<AcademicEvent, 'id' | 'created_at' | 'updated_at' | 'created_by'>;
type EventUpdateInput = Partial<Omit<AcademicEvent, 'id' | 'created_by' | 'created_at' | 'updated_at'>>;

interface EventsContextType {
  events: AcademicEvent[];
  loading: boolean;
  error: string | null;
  addEvent: (eventData: EventCreateInput) => Promise<AcademicEvent>;
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

  const refreshEvents = useCallback(async (): Promise<void> => {
    if (!isSupabaseConfigured || !user) {
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
      console.error('Failed to load events:', {
        message: loadError.message,
        code: loadError.code,
        details: loadError.details,
        hint: loadError.hint,
      });
      setEvents([]);
      setError(loadError.message || getFriendlySupabaseError('load'));
      setLoading(false);
      return;
    }

    setEvents((data ?? []) as AcademicEvent[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  const addEvent = async (eventData: EventCreateInput): Promise<AcademicEvent> => {
    if (!isSupabaseConfigured) {
      const configError = 'Supabase is not configured. Please add valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.';
      setError(configError);
      throw new Error(configError);
    }

    if (!user) {
      const authError = 'You must be logged in as an administrator to create an event.';
      setError(authError);
      throw new Error(authError);
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
      console.error('Failed to create event:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      });
      const errorMsg = insertError.message || getFriendlySupabaseError('create');
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    const created = data as AcademicEvent;
    setEvents((prev) => [created, ...prev]);
    return created;
  };

  const updateEvent = async (id: string, updates: EventUpdateInput): Promise<boolean> => {
    if (!isSupabaseConfigured) {
      const configError = 'Supabase is not configured. Please add valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.';
      setError(configError);
      return false;
    }

    setError(null);

    const { data, error: updateError } = await supabase
      .from('academic_events')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Failed to update event:', {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
      });
      const errorMsg = updateError.message || getFriendlySupabaseError('update');
      setError(errorMsg);
      return false;
    }

    const updated = data as AcademicEvent;
    setEvents((prev) => prev.map((evt) => (evt.id === id ? updated : evt)));
    return true;
  };

  const deleteEvent = async (id: string): Promise<boolean> => {
    if (!isSupabaseConfigured) {
      const configError = 'Supabase is not configured. Please add valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.';
      setError(configError);
      return false;
    }

    setError(null);

    const { data, error: deleteError } = await supabase
      .from('academic_events')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (deleteError) {
      console.error('Failed to delete event:', {
        message: deleteError.message,
        code: deleteError.code,
        details: deleteError.details,
        hint: deleteError.hint,
      });
      const errorMsg = deleteError.message || getFriendlySupabaseError('delete');
      setError(errorMsg);
      return false;
    }

    if (!data) {
      const notFoundMsg = 'Event not found or you do not have permission to delete it.';
      setError(notFoundMsg);
      return false;
    }

    setEvents((prev) => prev.filter((evt) => evt.id !== id));
    return true;
  };

  const toggleEventActive = async (id: string): Promise<boolean> => {
    if (!isSupabaseConfigured) {
      const configError = 'Supabase is not configured. Please add valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.';
      setError(configError);
      return false;
    }

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
      console.error('Failed to toggle event status:', {
        message: toggleError.message,
        code: toggleError.code,
        details: toggleError.details,
        hint: toggleError.hint,
      });
      const errorMsg = toggleError.message || getFriendlySupabaseError('toggle');
      setError(errorMsg);
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
