<?php

/*
 * This file is part of zhihe/ui.
 *
 * Copyright (c) 2026 Zhihe.
 *
 * For the full copyright and license information, please view the LICENSE.md
 * file that was distributed with this source code.
 */

use Flarum\Extend;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/less/forum.less'),

    (new Extend\User)
        ->registerPreference('zhihe.postFontSize', null, 'normal'),
];
