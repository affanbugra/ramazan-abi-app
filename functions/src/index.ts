import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions';

initializeApp();
setGlobalOptions({ region: 'europe-west1', maxInstances: 10 });

export { deleteMyAccount } from './account';
export { createInvite, registerWithInvite } from './invites';
export { onMessageCreated, onOrderCreated, onOrderUpdated, placeOrder } from './orders';
