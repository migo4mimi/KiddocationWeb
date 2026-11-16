import { supabase } from './supabase';

export async function saveTutorialCategoryToAccount(category) {
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const user = data?.user;
  if (!user) throw new Error('Please sign in again to save tutorial progress.');

  const current = user.user_metadata?.kiddocation_tutorial_categories;
  const categories = Array.isArray(current) ? current : [];
  const { error } = await supabase.auth.updateUser({
    data: {
      kiddocation_tutorial_categories: [...new Set([...categories, category])],
      kiddocation_tutorial_seen: false,
    },
  });

  if (error) throw error;
}
