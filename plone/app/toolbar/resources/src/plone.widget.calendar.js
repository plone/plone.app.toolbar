// plone integration for bootstrap datepicker widget.
//
// Author: Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
// Depends:
//    ++resource++plone.app.jquery.js
//    ++resource++
//
// Description:
//
// License:
//
// Copyright (C) 2010 Plone Foundation
//
// This program is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation; either version 2 of the License.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along with
// this program; if not, write to the Free Software Foundation, Inc., 51
// Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
//

/*jshint bitwise:true, curly:true, eqeqeq:true, immed:true, latedef:true,
  newcap:true, noarg:true, noempty:true, nonew:true, plusplus:true,
  undef:true, strict:true, trailing:true, browser:true, evil:true */
/*global jQuery:false */


(function($, undefined) {
"use strict";

$.plone.init.register(function(context) {

  $('.plone-jscalendar-popup', context).each(function() {
    var $el = $(this),
        $field = $el.parent(),
        $calendar = $('img', $el),
        date = new Date(),
        fieldId = $el.attr('id').substr(0, $el.attr('id').length - 6);

    function getField(component) {
      return $field.find('#' + fieldId + '_' + component);
    }

    // calculate initial date
    if (getField('year').val() === '0000') {
      date = '' +
        date.getFullYear() + '-' +
        (date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1) + '-' +
        (date.getDate() < 10 ? '0' : '') + date.getDate();
    } else {
      date = getField('year').val() + '-' + getField('month').val() + '-' + getField('day').val();
    }

    $calendar
      // set initial date
      .attr('data-date', date)
      // initialize datepicker widget
      .datepicker({ format: 'yyyy-mm-dd', autoclose: true })
      // update dropdowns on calendar change
      .on('changeDate', function(e){
        getField('year').val(e.date.getFullYear());
        getField('month').val(e.date.getMonth() < 9 ? '0' + (e.date.getMonth() + 1) : e.date.getMonth() + 1);
        getField('day').val(e.date.getDate() < 10 ? '0' + e.date.getDate() : e.date.getDate());
      });

    // update datepicker on dropdown change
    $field.find('#'+fieldId+'_year,' + '#'+fieldId+'_month,' + '#'+fieldId+'_day')
      .on('change', function(e) {
        $calendar.data('date', getField('year').val() + '-' + getField('month').val() + '-' + getField('day').val());
        $calendar.datepicker('update');
    });

    // make sure calendar is visible
    $el.show();

  });
});

}(jQuery));
