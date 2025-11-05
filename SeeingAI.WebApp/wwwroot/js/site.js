// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

document.addEventListener('DOMContentLoaded', () => {
	const button = document.getElementById('simulateButton');
	const status = document.getElementById('status');
	const payload = document.getElementById('payload');
	const analyzeButton = document.getElementById('analyzeButton');
	const imageInput = document.getElementById('imageInput');
	const analysisStatus = document.getElementById('analysisStatus');
	const analysisPayload = document.getElementById('analysisPayload');

	if (!button || !status || !payload) {
		return;
	}

	button.addEventListener('click', async () => {
		status.className = 'mt-3 alert alert-warning';
		status.textContent = 'Triggering incident and sending telemetry...';
		payload.textContent = '';

		try {
			const response = await fetch('/api/incidents/trigger', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ scenario: 'Production Incident - SRE Investigation' })
			});

			if (!response.ok) {
				throw new Error(`Request failed with status ${response.status}`);
			}

			const data = await response.json();
			status.className = 'mt-3 alert alert-success';
			status.textContent = 'Telemetry emitted successfully. Check Application Insights for new logs and traces.';

			payload.innerHTML = `<pre class="bg-light p-3 border rounded">${JSON.stringify(data, null, 2)}</pre>`;
		} catch (error) {
			console.error('Telemetry trigger failed', error);
			status.className = 'mt-3 alert alert-danger';
			status.textContent = 'Failed to emit telemetry. Check console for details.';
		}
	});

	if (analyzeButton && imageInput && analysisStatus && analysisPayload) {
		analyzeButton.addEventListener('click', async () => {
			const file = imageInput.files?.[0];
			if (!file) {
				analysisStatus.className = 'mt-3 alert alert-warning';
				analysisStatus.textContent = 'Please choose an image before triggering analysis.';
				return;
			}

			analysisStatus.className = 'mt-3 alert alert-info';
			analysisStatus.textContent = `Analyzing ${file.name} (${Math.round(file.size / 1024)} KB)...`;
			analysisPayload.textContent = '';

			const formData = new FormData();
			formData.append('image', file);

			try {
				const response = await fetch('/api/seeingai/analyze', {
					method: 'POST',
					body: formData
				});

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(errorText || `Request failed with status ${response.status}`);
				}

				const data = await response.json();
				analysisStatus.className = 'mt-3 alert alert-success';
				analysisStatus.textContent = 'Image processed successfully. Inspect telemetry for detailed traces.';
				analysisPayload.innerHTML = `<pre class="bg-light p-3 border rounded">${JSON.stringify(data, null, 2)}</pre>`;
			} catch (error) {
				console.error('Image analysis failed', error);
				analysisStatus.className = 'mt-3 alert alert-danger';
				analysisStatus.textContent = 'Image analysis failed. A telemetry exception should now be visible.';
				analysisPayload.innerHTML = `<pre class="bg-light p-3 border rounded">${error}</pre>`;
			}
		});
	}
});
