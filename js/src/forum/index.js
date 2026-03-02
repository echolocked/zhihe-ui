import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import DiscussionListState from 'flarum/forum/states/DiscussionListState';
import DiscussionListItem from 'flarum/forum/components/DiscussionListItem';
import DiscussionPage from 'flarum/forum/components/DiscussionPage';
import TextEditor from 'flarum/common/components/TextEditor';
import TextEditorButton from 'flarum/common/components/TextEditorButton';
import Button from 'flarum/common/components/Button';
import abbreviateNumber from 'flarum/common/utils/abbreviateNumber';
import icon from 'flarum/common/helpers/icon';
import classList from 'flarum/common/utils/classList';
import styleSelectedText from 'flarum/common/utils/styleSelectedText';

// --- Font Size ---
const FONT_PREF_KEY = 'zhihe.postFontSize';
let currentFontSize = 'normal';

function applyFontSize(size) {
    document.body.classList.remove('zhihe-font-large', 'zhihe-font-larger');
    if (size === 'large') document.body.classList.add('zhihe-font-large');
    else if (size === 'larger') document.body.classList.add('zhihe-font-larger');
    localStorage.setItem(FONT_PREF_KEY, size);
    currentFontSize = size;
}

app.initializers.add('zhihe-ui', () => {
    // Restore font size on boot (user server pref > localStorage > default)
    const user = app.session && app.session.user;
    const initialSize = (user && user.preferences() && user.preferences()[FONT_PREF_KEY])
        || localStorage.getItem(FONT_PREF_KEY)
        || 'normal';
    applyFontSize(initialSize);

    // --- Mobile reply count ---
    extend(DiscussionListItem.prototype, 'infoItems', function (items) {
        const discussion = this.attrs.discussion;
        const replyCount = discussion.replyCount();
        const isUnread = discussion.isUnread();

        items.add('mobile-reply-count', m('span', {
            className: classList('item-mobile-reply-count', { unread: isUnread }),
            onclick: isUnread ? this.markAsRead.bind(this) : undefined
        }, [
            icon(isUnread ? 'fas fa-comment' : 'far fa-comment'),
            ' ',
            abbreviateNumber(replyCount)
        ]), 10);
    });

    // --- Font size toggle in DiscussionPage sidebar ---
    const FONT_LABELS = { normal: 'A', large: 'A+', larger: 'A++' };
    const FONT_NEXT   = { normal: 'large', large: 'larger', larger: 'normal' };

    extend(DiscussionPage.prototype, 'sidebarItems', function (items) {
        items.add('fontSizeToggle',
            Button.component({
                className: 'Button Button--block',
                icon: 'fas fa-font',
                onclick: () => {
                    const next = FONT_NEXT[currentFontSize];
                    applyFontSize(next);
                    if (app.session && app.session.user) {
                        app.session.user.savePreferences({ [FONT_PREF_KEY]: next });
                    }
                    m.redraw();
                }
            }, '字体 ' + FONT_LABELS[currentFontSize]),
            4  // Just below 仅正文 (priority 5)
        );
    });

    // --- BBCode toolbar ---
    extend(TextEditor.prototype, 'toolbarItems', function (items) {
        const ed = () => this.attrs.composer.editor;
        const bbWrap = (pre, suf) => () => styleSelectedText(ed().el, { prefix: pre, suffix: suf, trimFirst: true });

        items.add('bb-bold',
            TextEditorButton.component({ title: '粗体 [b]', icon: 'fas fa-bold', onclick: bbWrap('[b]', '[/b]') }),
            900);
        items.add('bb-italic',
            TextEditorButton.component({ title: '斜体 [i]', icon: 'fas fa-italic', onclick: bbWrap('[i]', '[/i]') }),
            800);
        items.add('bb-underline',
            TextEditorButton.component({ title: '下划线 [u]', icon: 'fas fa-underline', onclick: bbWrap('[u]', '[/u]') }),
            700);
        items.add('bb-strikethrough',
            TextEditorButton.component({ title: '删除线 [s]', icon: 'fas fa-strikethrough', onclick: bbWrap('[s]', '[/s]') }),
            600);
        items.add('bb-quote',
            TextEditorButton.component({ title: '引用 [quote]', icon: 'fas fa-quote-left', onclick: bbWrap('[quote]', '[/quote]') }),
            500);
        items.add('bb-link',
            TextEditorButton.component({ title: '链接 [url]', icon: 'fas fa-link',
                onclick: () => styleSelectedText(ed().el, { prefix: '[url=https://]', suffix: '[/url]', trimFirst: true }) }),
            400);
        items.add('bb-size',
            TextEditorButton.component({ title: '字号 [size]', icon: 'fas fa-text-height', onclick: bbWrap('[size=18]', '[/size]') }),
            300);
    });

    // --- fof/polls: fix missing m.redraw() + SubtreeRetainer bypass for multi-choice submit button ---
    // Bug 1 (PostPoll.tsx:229-233): changeVote() sets pendingSubmit=true but never calls m.redraw().
    // Bug 2 (addPollsToPost.tsx:30-45): CommentPost's SubtreeRetainer blocks re-renders unless poll
    //   store data changes — but pendingSubmit is local component state, invisible to the retainer.
    // Fix: on checkbox change inside a multi-choice poll, dirty poll.data.attributes with a timestamp
    //   so the SubtreeRetainer sees a change, then call m.redraw() to show the submit button.
    // Uses document-level event delegation (bubble phase) so changeVote() always runs first.
    document.addEventListener('change', function(e) {
        const input = e.target;
        if (!input || input.type !== 'checkbox') return;
        const postPoll = input.closest && input.closest('.Post-poll');
        if (!postPoll) return;
        const poll = app.store.getById('polls', postPoll.dataset.id);
        if (!poll || !poll.allowMultipleVotes() || poll.canChangeVote()) return;
        if (poll.data && poll.data.attributes) poll.data.attributes._zhihe_pending = Date.now();
        m.redraw();
    });

    // --- Sort dropdown reordering: latest → newest → top → oldest ---
    override(DiscussionListState.prototype, 'sortMap', function(original) {
        const map = original();
        const newMap = {};

        if ('relevance' in map) newMap.relevance = map.relevance;
        if ('latest' in map) newMap.latest = map.latest;
        if ('newest' in map) newMap.newest = map.newest;

        for (const key in map) {
            if (!(key in newMap)) newMap[key] = map[key];
        }

        return newMap;
    });
});
