import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export function useSchedule(providerId) {
    const { user } = useAuthStore();
    const [schedule, setSchedule] = useState([]);
    const [vacations, setVacations] = useState([]);
    const [loading, setLoading] = useState(true);

    const pid = providerId || user?.id;

    const fetchSchedule = useCallback(async () => {
        if (!pid) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data: sched } = await supabase
                .from('provider_schedules')
                .select('*')
                .eq('provider_id', pid)
                .order('day_of_week');
            if (sched) setSchedule(sched);

            const { data: vacs } = await supabase
                .from('provider_vacations')
                .select('*')
                .eq('provider_id', pid)
                .gte('end_date', new Date().toISOString().split('T')[0])
                .order('start_date');
            if (vacs) setVacations(vacs);
        } catch { /* ignore */ } finally { setLoading(false); }
    }, [pid]);

    useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

    const updateSlot = async (dayOfWeek, startTime, endTime, isAvailable = true) => {
        if (!user) return;
        try {
            const { error } = await supabase.from('provider_schedules').upsert({
                provider_id: user.id,
                day_of_week: dayOfWeek,
                start_time: startTime,
                end_time: endTime,
                is_available: isAvailable,
            }, { onConflict: 'provider_id,day_of_week' });
            if (error) throw error;
            toast.success('Schedule updated');
            await fetchSchedule();
        } catch (err) { toast.error(err.message || 'Failed to update schedule'); }
    };

    const setVacation = async (startDate, endDate) => {
        if (!user) return;
        try {
            const { error } = await supabase.from('provider_vacations').insert({
                provider_id: user.id, start_date: startDate, end_date: endDate,
            });
            if (error) throw error;
            toast.success('Vacation mode set 🏖️');
            await fetchSchedule();
        } catch (err) { toast.error(err.message || 'Failed to set vacation'); }
    };

    const cancelVacation = async (vacId) => {
        try {
            await supabase.from('provider_vacations').delete().eq('id', vacId);
            toast.success('Vacation cancelled');
            await fetchSchedule();
        } catch (err) { toast.error(err.message || 'Failed to cancel vacation'); }
    };

    const isAvailable = (dayOfWeek, time) => {
        // Check vacation
        const today = new Date().toISOString().split('T')[0];
        const onVacation = vacations.some(v => today >= v.start_date && today <= v.end_date);
        if (onVacation) return false;

        const slot = schedule.find(s => s.day_of_week === dayOfWeek);
        if (!slot || !slot.is_available) return false;
        if (time && slot.start_time && slot.end_time) {
            return time >= slot.start_time && time <= slot.end_time;
        }
        return true;
    };

    return { schedule, vacations, loading, updateSlot, setVacation, cancelVacation, isAvailable, refetch: fetchSchedule };
}
