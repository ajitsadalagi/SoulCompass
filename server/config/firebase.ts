import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount: ServiceAccount = {
  type: "service_account",
  project_id: "csanthi-a20cf",
  private_key_id: "bd6cb9d16995a470e84d4bcb7e594a9df6f56a9d",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDaFxvQC5P5zOR6\n0gOHk5lUl6WrviKKdfoqhDN5TLHgmLQfZ2Mp8NsRMGzTTM75GTljUfLIOEr4l1nO\nCg4cHC7MadqANYvTz5dqRUulw5lwEVLAcfLWZndL6mpL0jdAsZalixXq+CGAnACR\n41M2UEQmLjoneZh/8SBvBQECbt4plCa+UVJrFGZjx25RIaoJ142UG5rbUwpXmruq\nnRPlvs5QSdbq12eTgipBnIPHAlatls0qtQCIesCj/+8Hm6Mxyekw4dsz1i9Coqe8\n9b2T+LtBgiMh3QKFGRGn2EOzZUYBBPbVwAQfsRNxrwPhn0YaD6PsLgXmfwBPQwDD\n0vw7pG73AgMBAAECggEAW488E/noZAVLHu0woiirRMJtwU6PvcWOA2+BFLnIK9yw\nMkb7cM43il3kMkma0yVt3G65GKnZf8g64a+DAPYsB5GhNBZG3+PVU75H5g3aSxxa\nu4SbSLu39d0yRya4H6bu8g0UZJNLrWzRKG5hrvm/wq/BpnT8OyqGTVWyeM0G5DkS\nKgu/E8BwlfsR1sx8mvh2RISUOMp0BnVWp4Y/gP8kxbI+tw8MAuXQN+tGoQI7FCEw\n2gmjUhqLgMJ196WnHIjBYg6PHkJwfhnl+oQ6GtZXOy5Fxbfifu8Vv+jKDboYXnvI\nsCAMMBB+NicM6CtX6xcmBJP/qQ0jUDESulXt34H04QKBgQDun/jwZzl1uOebw52D\n32a3cV7dEvt3f3lcsOlpRRhvgoeyEBNk6jk0ec5dtaiZbRTQQU96rOw6IhoGYCXv\nI0kT6zeKsoZSKCWxBsqiIcDxdFxvn299hueKKu6naqRltEo+8zg670OOvUyYM0zq\ngLvEhuwPpWfzqJWe0z9FwdXX6QKBgQDp+F2evWz/KOVLjD9uw25/tS4Pvb9Yxs/C\n7vAGCmDn+rUh9URFMBtSNmIG6gW4WsMb+hC/YSsj1Pe6q8fRB1cTb68t1FkfsvIW\nEDuNMPi9yNpwUEMNbKPa07xavVEmCi7mcdkMFiCbJAZkBXuJvpdIG/n2bjoyqAN1\nOU/04ESj3wKBgDbcKmRCpxAsiXrjFySJSNklxFR5F70aXnFz7sWX8A066i2CyqKp\nwqsQ0ePzbqaPUHisezRN6yVWT7tlgXMgHp3otuU5M+5RcpDnadCqh+w6/0FeW0h1\nqme2hRWSS+dh8qvUSPorpdF8Lc7UBHvpSsHc7wqN0X9QI83W7TYBYUN5AoGBAKQ9\ncdK93GadmaBX2itxyv6g+62XIFw8a5nGSv2iiXYu2rn0xzDeXT9v54489zj7lZzt\nBJajqjnkBOaoMYM9aNW+/7TnLI0A+8mbKYKqjuICvbw7y2YADmHNYpo77VwLp/Ki\nlp9SZR8iwc2yv47pGJ9I7EYeCIKIyKygR815JRX3AoGAGqqeX9L6TJv/lev5hdFl\n2sczG50fKoGE/oxCQDJiW13CZd/CEFiiIOaQlOi6LGt83IpRIhVMkUC2UE80KbJc\nEdNNTwP5z/YaNgEck6XF2g3WUcLHxcqTJkfdtWNYdqJpyuXqnw+OBQqhorvRDGEC\n3frSKh/efAfopi5ApI9ZRLw=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@csanthi-a20cf.iam.gserviceaccount.com",
  client_id: "118177262393911240620",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40csanthi-a20cf.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount)
});

// Get Auth and Firestore Admin instances
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;