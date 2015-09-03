(function ($) {
	$(function() {
		var escape = function(t) {
			return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		};

		var Ticker = function (endTime) {
			var self = this;
			self.working = true;
			var tick = function () {
				if (!self.working) return;
				var remained = endTime - new Date();
				$('#spBindingRemain').text(parseInt(remained / 1000));
				if (remained > 0)
					window.setTimeout(tick, 400);
				else {
					$('#divSuccess').hide();
					$("#divExtender").show();
				}
			};
			tick();
		};

		var ticker = null;
		var o;
		(o = {
			e: function() { alert('Nothing worked here :('); },
			m1: function() {
				if (ticker) ticker.working = false;

				doRequest({ action: 'salt' }, o.m2, o.e);
				return false;
			},
			m2: function(r1) {
				if (!r1) {
					o.e();
					return;
				}
				var salt = r1.salt;
				var pass = Sha256.hash(Sha256.hash($('#tbPassword').val()) + salt);
				doRequest({
					action: 'login',
					login: $('#tbLogin').val(),
					salt: salt,
					password: pass
				}, o.m3, o.e);
			},
			m3: function(res) {
				$("#divExtender").hide();
				if (!res.isSuccess) {
					$('#divWrongPassword').show();
					$('#divSuccess').hide();
				} else {
					$('#divWrongPassword').hide();
					$('#divSuccess').show();
					$('#spBinding').text((res.binding.displayHost || document.location.hostname) + ':' + res.binding.displayPort);
					if (res.binding.bindTime) {
						var d = new Date();
						$('#spBindingRemain').text(parseInt(res.binding.bindTime));
						d.setSeconds(d.getSeconds() + res.binding.bindTime);
						ticker = new Ticker(d);
					} else {
						$('#spBindingRemain').html('&infin');
						
					}
				}
			}
		});

		$('#btnLogin').on('click', o.m1);

		var doRequest = function(data, success, error) {
			$.ajax({
				type: "POST",
				url: "/api",
				data: JSON.stringify(data),
				contentType: "application/json",
				success: success,
				error: error,
				complete: function() {
					
				}
			});
		};

		// doRequest();
	});
})(window.jQuery)