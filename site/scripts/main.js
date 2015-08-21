(function ($) {
	$(function() {
		var escape = function(t) {
			return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		};

		$('#btnLogin').on('click', function () {
			var o;
			(o = {
				e: function () { alert('Nothing worked here :('); },
				m1: function () { doRequest({ action: 'salt' }, o.m2, o.e) },
				m2: function (r1) {
					if (!r1) {
						o.e();
						return;
					}
					var salt = r1.salt;
					var pass = Sha256.hash($('#tbPassword').val() + salt);
					doRequest({
						action: 'login',
						login: $('#tbLogin').val(),
						salt: salt,
						password: pass
					}, o.m3, o.e);
				},
				m3: function (res) {
					if (!res.isSuccess) {
						$('#divWrongPassword').show();
						$('#divSuccess').hide();
					}
					else {
						$('#divWrongPassword').hide();
						$('#divSuccess').show();
						$('#spBinding').text(res.binding);
					}
				}
			}).m1();

			

			
		});

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