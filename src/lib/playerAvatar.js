export function avatarForPlayer(player, currentUserId, currentAvatarId) {
  return player?.user_id === currentUserId
    ? currentAvatarId || player?.avatar_id
    : player?.avatar_id;
}
