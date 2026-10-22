import api from '../lib/api';

export async function fetchRtos() {
  const { data } = await api.get('/rtos');
  return data.rtos || [];
}

export async function createRto(name) {
  const { data } = await api.post('/rtos', { name });
  return data.rto;
}
