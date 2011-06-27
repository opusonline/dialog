/*!
 * jquery dialog 1.1
 * 
 * Copyright 2011, Stefan Benicke (opusonline.at)
 * Dual licensed under the MIT or GPL Version 3 licenses. (LICENSES.txt)
 */
(function($) {
	var $window = $(window),
		$document = $(document),
		$container = $('#dialog'),
		$overlay = $('#dialog-overlay'),
		$loading = $('#dialog-loading'),
		$temp,
		$wrap,
		$close,
		$element,
		$inline,
		$buttons,
		current_options,
		current_element,
		container_left,
		container_height,
		namespace = '.dialog',
		is_open = false,
		is_image = false,
		preload_image = new Image(),
		inline_regexp = /^#.+/,
		image_regexp = /\.(jpg|gif|png|bmp|jpeg)$/i,
		javascript_regexp = /^javascript:/i,
		percent_regexp = /^(\d+)%$/,
		max = Math.max,
		min = Math.min,
		start_opacity = 0.2,
		esc_key = 27,
		ajax,
		defaults = {
			speed: 250,
			margin: 30,
			overlayOpacity: 0.3,
			overlayColor: '#333',
			type: '',
			href: '',
			content: '',
			ajax: {},
			buttons: [],
			width: 560,
			height: 340,
			maxWidth: null,
			maxHeight: null,
			autoSize: true,
			onStart: function(){},
			onComplete: function(){},
			onClosed: function(){},
			onCancel: function(){},
			onError: function(){}
		},
		_keyAction = function(event) {
			if ( ! is_open) return;
			if (event.keyCode == esc_key) {
				event.preventDefault();
				$.dialog.close();
			}
		},
		_init = function() {
			var display_none = {display: 'none'};
			if ( ! $container.length) {
				$('body').append(
					$container = $('<div/>').attr('id', 'dialog').css(display_none).append(
						$wrap = $('<div/>').attr('class', 'wrap'),
						$close = $('<a href="javascript:void(0)" class="close">close</a>').click($.dialog.close)
					),
					$overlay = $('<div/>').attr('id', 'dialog-overlay').css(display_none).click($.dialog.close),
					$loading = $('<div/>').attr('id', 'dialog-loading').css(display_none).click($.dialog.cancel),
					$temp = $('<div/>').attr('id', 'dialog-temp').css({display: 'none', position: 'absolute'})
				);
			}
		},
		_start = function() {
			current_options.onStart.call(current_element.pointer);
			_abortAjax();
			is_image = false;
			var source = current_element.source,
				type =
					inline_regexp.test(source) ? 'inline' :
					image_regexp.test(source) ? 'image' :
					current_options.content ? 'html' :
					'ajax';
			if (current_options.type) type = current_options.type;
			if (current_element.is_iframe) type = 'iframe';
			
			if (type == 'iframe') _showIframe();
			else if (type == 'html') _showContent();
			else if (type == 'inline') _showInline();
			else if (type == 'image') _loadImage();
			else if (type == 'ajax') _loadAjax();
		},
		_loadImage = function() {
			$.dialog.showLoading();
			preload_image = new Image();
			preload_image.onload = _showImage;
			preload_image.onerror = _loadError;
			preload_image.src = current_element.source;
		},
		_loadAjax = function() {
			$.dialog.showLoading();
			var url = current_options.href || current_element.source;
			ajax = $.ajax($.extend({}, {
				url: url,
				success: _showContent,
				error: _loadError
			}, current_options.ajax));
		},
		_abortAjax = function() {
			$loading.hide();
			preload_image.onload = preload_image.onerror = null;
			if (ajax) {
				ajax.abort();
				ajax = null;
			}
		},
		_loadError = function() {
			var text = arguments[2] || '"' + current_element.source + '" not found.',
				content = '<span class="error">Load Error! ' + text + '</span>';
			
			current_options.onError.call(current_element.pointer);
			_showContent(content);
		},
		_showImage = function() {
			$.dialog.hideLoading();
			is_image = true;
			$element = $('<img/>').attr({src: preload_image.src}).css({width: preload_image.width, height: preload_image.height, 'vertical-align': 'middle'});
			_showContainer();
		},
		_showIframe = function() {
			$element = $('<iframe/>').attr({src: current_element.source, name: 'dialog-iframe', frameborder: 0}).css({width: current_options.width, height: current_options.height, 'vertical-align': 'middle'});
			_showContainer();
		},
		_showInline = function() {
			var element = current_options.href || current_element.source;
			$element = $(element).after($inline = $('<div/>')).show();
			_showContainer();
		},
		_showContent = function() {
			$.dialog.hideLoading();
			var content = arguments[0] || current_options.content;
			$element = $('<div/>').html(content);
			_showContainer();
		},
		_showContainer = function() {
			_adjustSize();
			$wrap.append($element);
			$overlay.css({opacity: current_options.overlayOpacity, background: current_options.overlayColor}).fadeIn(current_options.speed);
			$container.css({opacity: start_opacity, top: - container_height, left: container_left}).show()
			.animate({opacity: 1, top: 0}, current_options.speed, function() {
				is_open = true;
				current_options.onComplete.call(current_element.pointer);
			});
		},
		_addButtons = function() {
			$buttons = $('<div/>').attr('class', 'buttons').insertAfter($wrap);
			var buttons = current_options.buttons,
				__clickMe = function(event) {
					$(this).data('callback').call($element, event);
				};
			
			for (var i in buttons) {
				$('<button/>').attr({type: 'button'}).data('callback', buttons[i].click).html(buttons[i].text).click(__clickMe).appendTo($buttons);
			}
		},
		_adjustSize = function() {
			$wrap.empty();
			$element.appendTo($temp);
			var container_only_width = $container.outerWidth();
			if (current_options.buttons.length) {
				_addButtons();
				$close.hide();
			}
			var container_only_height = $container.outerHeight(),
				element_width = $temp.outerWidth(),
				element_height = $temp.outerHeight(),
				view_width = $window.width(),
				view_height = $window.height(),
				element_max_width = view_width - container_only_width - current_options.margin * 2,
				element_max_height = view_height - container_only_height - current_options.margin,
				options_max_width = current_options.maxWidth,
				options_max_height = current_options.maxHeight,
				is_iframe = current_element.is_iframe,
				is_percent, ratio;
			
			if (is_iframe || ! current_options.autoSize) {
				element_width = current_options.width;
				element_height = current_options.height;
			}
			if (options_max_width) {
				is_percent = options_max_width.toString(10).match(percent_regexp);
				element_max_width = is_percent ? element_max_width / 100 * min(is_percent[1], 100) : min(options_max_width, element_max_width);
			}
			if (options_max_height) {
				is_percent = options_max_height.toString(10).match(percent_regexp);
				element_max_height = is_percent ? element_max_height / 100 * min(is_percent[1], 100) : min(options_max_height, element_max_height);
			}
			if (element_height > element_max_height) {
				if (is_image) {
					ratio = element_width / element_height;
					element_height = element_max_height;
					element_width = element_height * ratio;
				} else {
					element_height = element_max_height;
				}
			}
			if (element_width > element_max_width) {
				if (is_image) {
					ratio = element_height / element_width;
					element_width = element_max_width;
					element_height = element_width * ratio;
				} else {
					element_width = element_max_width;
				}
			}
			if ( ! is_image && ! is_iframe) element_width++; // prevent word wrap
			container_height = element_height + container_only_height;
			container_left = max((view_width - element_width - container_only_width / 2) / 2, 0);
			$element.css({width: element_width, height: element_height});
		};
		
	$.fn.dialog = function(options) {
		var options = $.extend({}, defaults, options);
		
		return this.each(function() {
			var me = $(this),
				source = options.href || me.attr('href'),
				is_iframe = me.hasClass('iframe'),
				element = {pointer: me, source: source, is_iframe: is_iframe},
				__setCurrent = function(event) {
					event.preventDefault();
					current_options = options;
					current_element = element;
					_start();
				};
			
			if ( ! source || javascript_regexp.test(source) || source == '#') return;
			me.unbind(namespace).bind('click' + namespace, __setCurrent);
		});
	};
	
	$.dialog = function(options) {
		if ( ! options) return;
		var is_iframe = options.type == 'iframe' ? true : false;
		current_options = $.extend({}, defaults, options);
		current_element = {pointer: document, source: current_options.href, is_iframe: is_iframe};
		_start();
	};
	
	$.dialog.defaults = function(options) {
		$.extend(defaults, options);
	};
	
	$.dialog.showLoading = function() {
		$loading.show();
	};
			
	$.dialog.hideLoading = function() {
		$loading.hide();
	};
			
	$.dialog.cancel = function() {
		if ( ! current_element) {
			$.dialog.hideLoading();
			return;
		}
		current_options.onCancel.call(current_element.pointer);
		_abortAjax();
	};
	
	$.dialog.close = function() {
		_abortAjax();
		$overlay.fadeOut(current_options.speed);
		$container.animate({top: - container_height, opacity: start_opacity}, current_options.speed, function() {
			is_open = false;
			if ($inline) {
				$inline.after($element.hide()).remove();
				$inline = null;
			}
			if ($buttons) {
				$buttons.remove();
				$buttons = null;
				$close.show();
			}
			$container.hide();
			current_options.onClosed.call(current_element.pointer);
		});
	};
	
	_init();
	
	$window.unbind(namespace).bind('keydown' + namespace, _keyAction);
	
})(jQuery);