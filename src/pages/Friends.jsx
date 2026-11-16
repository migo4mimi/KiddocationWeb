import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { chatMessageProblem } from '../lib/chatModeration';
import { isCurrentConversation } from '../lib/conversations';
import './Friends.css';

function getErrorMessage(error) {
  const message = error?.message || '';
  if (
    message.includes('search_players')
    && (
      error?.code === 'PGRST202'
      || /schema cache|could not find|does not exist/i.test(message)
    )
  ) {
    return 'Player search is not enabled on this server yet. Apply the friends and chat Supabase migration.';
  }
  if (message.includes('students_only')) {
    return 'Friend search is still restricted on the server. Apply the latest friends/chat migration.';
  }
  if (message.includes('chat_message_filtered')) {
    return 'Please reword that message. Some language or personal information is not allowed in chat.';
  }
  if (message.includes('request_received')) {
    return 'This player already sent you a request. Accept or decline it in Friend requests.';
  }
  if (message.includes('already_friends')) return 'You are already friends.';
  if (message.includes('already_pending')) return 'A friend request is already waiting.';
  if (message.includes('player_unavailable')) return 'This player is not available.';
  if (message.includes('not_friends')) return 'You are no longer friends with this player.';
  if (message.includes('search_term_too_short')) {
    return 'Enter at least two characters to search.';
  }
  return message || 'Something went wrong. Please try again.';
}

async function fetchPeople() {
  const [friendResult, requestResult, blockedResult] = await Promise.all([
    supabase.rpc('list_my_friends'),
    supabase.rpc('list_friend_requests'),
    supabase.rpc('list_my_blocks'),
  ]);
  const problem = friendResult.error || requestResult.error || blockedResult.error;
  if (problem) throw problem;
  return {
    friends: friendResult.data || [],
    requests: requestResult.data || [],
    blockedUsers: blockedResult.data || [],
  };
}

export default function Friends({ profile, onBack }) {
  const userId = profile?.id;
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [activeFriend, setActiveFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [draft, setDraft] = useState('');
  const [showBlocked, setShowBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const messagesEndRef = useRef(null);
  const activeFriendIdRef = useRef(null);

  const loadPeople = useCallback(async () => {
    const data = await fetchPeople();
    setFriends(data.friends);
    setRequests(data.requests);
    setBlockedUsers(data.blockedUsers);
  }, []);

  useEffect(() => {
    let active = true;

    fetchPeople()
      .then((data) => {
        if (!active) return;
        setFriends(data.friends);
        setRequests(data.requests);
        setBlockedUsers(data.blockedUsers);
      })
      .catch((problem) => {
        if (active) setError(getErrorMessage(problem));
      });

    return () => {
      active = false;
    };
  }, [loadPeople]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadPeople().catch((problem) => setError(getErrorMessage(problem)));
    }, 15000);
    return () => window.clearInterval(interval);
  }, [loadPeople]);

  const loadMessages = useCallback(async () => {
    if (!activeFriend || !userId) return;

    const { data, error: problem } = await supabase
      .from('chat_messages')
      .select('id, sender_id, recipient_id, body, created_at')
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${activeFriend.user_id}),and(sender_id.eq.${activeFriend.user_id},recipient_id.eq.${userId})`
      )
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(100);

    if (problem) throw problem;
    if (!isCurrentConversation(activeFriend.user_id, activeFriendIdRef.current)) return;
    setMessages((data || []).reverse());
  }, [activeFriend, userId]);

  useEffect(() => {
    if (!activeFriend) {
      return undefined;
    }

    let active = true;
    const refresh = async () => {
      try {
        await loadMessages();
      } catch (problem) {
        if (active) setError(getErrorMessage(problem));
      }
    };

    refresh();
    const interval = window.setInterval(refresh, 4000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [activeFriend, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  function openChat(friend) {
    activeFriendIdRef.current = friend.user_id;
    setMessages([]);
    setError('');
    setActiveFriend(friend);
  }

  function closeChat() {
    activeFriendIdRef.current = null;
    setMessages([]);
    setActiveFriend(null);
  }

  async function searchPlayers(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (query.trim().length < 2) {
      setError('Enter at least two characters to search.');
      return;
    }

    setBusy(true);
    try {
      const { data, error: problem } = await supabase.rpc('search_players', {
        p_query: query.trim(),
      });
      if (problem) throw problem;
      setResults(data || []);
      if (!data?.length) setNotice('No players found. Check the name and try again.');
    } catch (problem) {
      setError(getErrorMessage(problem));
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action, successMessage, afterSuccess) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const problem = await action();
      if (problem) throw problem;
      await loadPeople();
      if (afterSuccess) await afterSuccess();
      setNotice(successMessage);
    } catch (problem) {
      setError(getErrorMessage(problem));
    } finally {
      setBusy(false);
    }
  }

  function sendRequest(player) {
    return runAction(
      async () => {
        const { error: problem } = await supabase.rpc('send_friend_request', {
          p_user_id: player.user_id,
        });
        return problem;
      },
      `Friend request sent to ${player.display_name}.`,
      async () => {
        const { data, error: problem } = await supabase.rpc('search_players', {
          p_query: query.trim(),
        });
        if (problem) throw problem;
        setResults(data || []);
      }
    );
  }

  function respondToRequest(request, accept) {
    return runAction(
      async () => {
        const { error: problem } = await supabase.rpc(
          accept ? 'accept_friend_request' : 'decline_friend_request',
          { p_request_id: request.request_id }
        );
        return problem;
      },
      accept
        ? `You and ${request.display_name} are now friends.`
        : 'Friend request declined.'
    );
  }

  function cancelRequest(request) {
    return runAction(
      async () => {
        const { error: problem } = await supabase.rpc('cancel_friend_request', {
          p_request_id: request.request_id,
        });
        return problem;
      },
      'Friend request cancelled.'
    );
  }

  function blockPlayer(player) {
    if (!window.confirm(`Block ${player.display_name}? They will no longer be able to message you.`)) {
      return;
    }

    runAction(
      async () => {
        const { error: problem } = await supabase.rpc('block_player', {
          p_user_id: player.user_id,
        });
        return problem;
      },
      `${player.display_name} has been blocked.`,
      async () => {
        closeChat();
        setResults([]);
      }
    );
  }

  function removeFriend(player) {
    if (!window.confirm(`Remove ${player.display_name} from your friends?`)) return;

    runAction(
      async () => {
        const { error: problem } = await supabase.rpc('remove_friend', {
          p_user_id: player.user_id,
        });
        return problem;
      },
      `${player.display_name} was removed from your friends.`,
      async () => closeChat()
    );
  }

  function unblockPlayer(player) {
    runAction(
      async () => {
        const { error: problem } = await supabase.rpc('unblock_player', {
          p_user_id: player.user_id,
        });
        return problem;
      },
      `${player.display_name} has been unblocked.`
    );
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!activeFriend || busy) return;

    const problem = chatMessageProblem(draft);
    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { error: sendError } = await supabase.from('chat_messages').insert({
        sender_id: userId,
        recipient_id: activeFriend.user_id,
        body: draft.trim(),
      });
      if (sendError) throw sendError;
      setDraft('');
      await loadMessages();
    } catch (problem) {
      setError(getErrorMessage(problem));
    } finally {
      setBusy(false);
    }
  }

  function reportMessage(message) {
    if (!window.confirm('Report this message to the game moderators?')) return;

    runAction(async () => {
      const { error: problem } = await supabase.rpc('report_chat_message', {
        p_message_id: message.id,
        p_reason: 'Inappropriate or unsafe content',
      });
      return problem;
    }, 'Message reported. Thank you for helping keep chat safe.');
  }

  const incoming = requests.filter((request) => request.direction === 'incoming');
  const outgoing = requests.filter((request) => request.direction === 'outgoing');

  return (
    <section className="friends-screen" aria-label="Friends and chat">
      <div className="friends-heading">
        <button type="button" className="friends-back" onClick={onBack}>
          ← Home
        </button>
        <h1>Friends</h1>
      </div>

      {error && <p className="friends-message friends-message--error" role="alert">{error}</p>}
      {notice && <p className="friends-message" role="status">{notice}</p>}

      {activeFriend ? (
        <section className="friends-chat" aria-label={`Chat with ${activeFriend.display_name}`}>
          <div className="friends-chat__heading">
            <button type="button" onClick={closeChat} aria-label="Back to friends">
              ←
            </button>
            <h2>{activeFriend.display_name}</h2>
            <button
              type="button"
              className="friends-chat__action"
              disabled={busy}
              onClick={() => removeFriend(activeFriend)}
            >
              Remove
            </button>
            <button
              type="button"
              className="friends-chat__action friends-chat__action--block"
              disabled={busy}
              onClick={() => blockPlayer(activeFriend)}
            >
              Block
            </button>
          </div>

          <div className="friends-chat__messages" aria-live="polite">
            {messages.length === 0 ? (
              <p className="friends-empty">Say hello to start chatting!</p>
            ) : messages.map((message) => {
              const isMine = message.sender_id === userId;
              return (
                <article
                  className={`friends-chat__message ${isMine ? 'is-mine' : ''}`}
                  key={message.id}
                >
                  <p>{message.body}</p>
                  {!isMine && (
                    <button
                      type="button"
                      onClick={() => reportMessage(message)}
                      disabled={busy}
                    >
                      Report
                    </button>
                  )}
                  <time dateTime={message.created_at}>
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </time>
                </article>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form className="friends-chat__composer" onSubmit={sendMessage}>
            <label className="friends-sr-only" htmlFor="friends-chat-message">
              Message {activeFriend.display_name}
            </label>
            <textarea
              id="friends-chat-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Write a safe message..."
              disabled={busy}
            />
            <button type="submit" disabled={busy || !draft.trim()}>
              Send
            </button>
            <small>{draft.length}/500 · No links or personal contact details</small>
          </form>
        </section>
      ) : (
        <>
          <form className="friends-search" onSubmit={searchPlayers}>
            <label htmlFor="friends-search-name">Find players by display name</label>
            <div>
              <input
                id="friends-search-name"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={80}
                placeholder="Enter a player name"
              />
              <button type="submit" disabled={busy}>Search</button>
            </div>
          </form>

          {results.length > 0 && (
            <section className="friends-list" aria-label="Player search results">
              <h2>Players</h2>
              {results.map((player) => (
                <div className="friends-row" key={player.user_id}>
                  <span>{player.display_name}</span>
                  {player.relationship === 'friend' ? (
                    <button type="button" onClick={() => openChat(player)}>Chat</button>
                  ) : player.relationship === 'request_sent' ? (
                    <span className="friends-row__status">Request sent</span>
                  ) : player.relationship === 'request_received' ? (
                    <span className="friends-row__status">Check requests</span>
                  ) : (
                    <button type="button" disabled={busy} onClick={() => sendRequest(player)}>
                      Add friend
                    </button>
                  )}
                </div>
              ))}
            </section>
          )}

          {incoming.length > 0 && (
            <section className="friends-list" aria-label="Incoming friend requests">
              <h2>Friend requests</h2>
              {incoming.map((request) => (
                <div className="friends-row" key={request.request_id}>
                  <span>{request.display_name}</span>
                  <div className="friends-row__actions">
                    <button type="button" disabled={busy} onClick={() => respondToRequest(request, true)}>
                      Accept
                    </button>
                    <button
                      type="button"
                      className="friends-button--quiet"
                      disabled={busy}
                      onClick={() => respondToRequest(request, false)}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {outgoing.length > 0 && (
            <section className="friends-list" aria-label="Sent friend requests">
              <h2>Sent requests</h2>
              {outgoing.map((request) => (
                <div className="friends-row" key={request.request_id}>
                  <span>{request.display_name}</span>
                  <button
                    type="button"
                    className="friends-button--quiet"
                    disabled={busy}
                    onClick={() => cancelRequest(request)}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </section>
          )}

          <section className="friends-list" aria-label="Your friends">
            <h2>Your friends</h2>
            {friends.length === 0 ? (
              <p className="friends-empty">Search for a player above to add your first friend.</p>
            ) : friends.map((friend) => (
              <div className="friends-row" key={friend.user_id}>
                <span>{friend.display_name}</span>
                <button type="button" onClick={() => openChat(friend)}>Chat</button>
              </div>
            ))}
          </section>

          <section className="friends-list friends-blocked">
            <button
              type="button"
              className="friends-blocked__toggle"
              aria-expanded={showBlocked}
              onClick={() => setShowBlocked((value) => !value)}
            >
              {showBlocked ? 'Hide' : 'Manage'} blocked players ({blockedUsers.length})
            </button>
            {showBlocked && blockedUsers.map((player) => (
              <div className="friends-row" key={player.user_id}>
                <span>{player.display_name}</span>
                <button type="button" disabled={busy} onClick={() => unblockPlayer(player)}>
                  Unblock
                </button>
              </div>
            ))}
          </section>
        </>
      )}
    </section>
  );
}
