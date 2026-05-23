import { Router } from 'express';
import { auth, db } from '../lib/documents.js';
import { updateOwnProfileSchema } from '../schemas/users.js';

const router: Router = Router();

router.put('/', async (req, res, next) => {
  try {
    const uid = req.user!.uid;
    const { displayName, photoURL } = updateOwnProfileSchema.parse(req.body);
    const supabaseAdmin = auth.getSupabaseAdmin();
    const now = new Date().toISOString();

    const authMetadata: Record<string, unknown> = {};
    if (displayName) authMetadata.display_name = displayName;
    if (photoURL) authMetadata.avatar_url = photoURL;

    if (Object.keys(authMetadata).length > 0) {
      await supabaseAdmin.auth.admin.updateUserById(uid, {
        user_metadata: authMetadata,
      });
    }

    const profilePatch: Record<string, unknown> = {
      updatedAt: now,
      updated_at: now,
    };

    if (displayName) {
      profilePatch.displayName = displayName;
      profilePatch.display_name = displayName;
    }

    if (photoURL) {
      profilePatch.photoURL = photoURL;
      profilePatch.avatar_url = photoURL;
    }

    const userRef = db.collection('users').doc(uid);
    const snapshot = await userRef.get();

    if (snapshot.exists) {
      await userRef.update(profilePatch);
    } else {
      await userRef.set({
        uid,
        email: req.user!.email,
        ...profilePatch,
        createdAt: now,
        created_at: now,
      });
    }

    if (displayName) {
      await supabaseAdmin
        .from('profiles')
        .update({
          display_name: displayName,
          updated_at: now,
        })
        .eq('id', uid);
    }

    res.json({ success: true, profile: { uid, ...profilePatch } });
  } catch (error) {
    next(error);
  }
});

export default router;
