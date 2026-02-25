import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import DiscussionListItem from 'flarum/forum/components/DiscussionListItem';
import abbreviateNumber from 'flarum/common/utils/abbreviateNumber';
import icon from 'flarum/common/helpers/icon';
import classList from 'flarum/common/utils/classList';

app.initializers.add('zhihe-ui', () => {
    extend(DiscussionListItem.prototype, 'infoItems', function (items) {
        const discussion = this.attrs.discussion;
        const replyCount = discussion.replyCount();
        const isUnread = discussion.isUnread();

        items.add('mobile-reply-count', m('span', {
            className: classList('item-mobile-reply-count', { unread: isUnread }),
            // Re-implement the classic Flarum interactive "mark as read" logic
            onclick: isUnread ? this.markAsRead.bind(this) : undefined
        }, [
            icon(isUnread ? 'fas fa-comment' : 'far fa-comment'),
            ' ',
            abbreviateNumber(replyCount)
        ]), 10);
    });
});
