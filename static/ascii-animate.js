function getElementsWithinDistance(mouseX, mouseY, distance) {
	const allElements = document.querySelectorAll('.ascii-character');
	const elementsWithinDistance = [];

	allElements.forEach((element) => {
		const rect = element.getBoundingClientRect();
		const elementX = rect.left + rect.width / 2;
		const elementY = rect.top + rect.height / 2;

		const distanceBetween = Math.sqrt(
			Math.pow(elementX - mouseX, 2) + Math.pow(elementY - mouseY, 2)
		);

		if (distanceBetween <= distance) {
			elementsWithinDistance.push(element);

			setTimeout(() => {
				element.classList.remove('highlighted');
			}, 9001);
			setTimeout(() => {
				element.classList.remove('highlighted-special');
			}, 45001);
			setTimeout(() => {
				element.classList.remove('highlighted-secondary');
			}, 999999);
		}
	});

	return elementsWithinDistance;
}

document.addEventListener('mousemove', (event) => {
	const mouseX = event.clientX;
	const mouseY = event.clientY;
	const distanceThreshold = 18;
	const secondaryDistanceThreshold = 27;

	const elements = getElementsWithinDistance(mouseX, mouseY, distanceThreshold);
	elements.forEach((element) => {
		element.classList.remove('highlighted');
		element.classList.remove('highlighted-special');

		const special = Math.random() * 10000 > 9001;
		const extraSpecial = Math.random() * 10000 > 9999;
		
		if (special) {
			element.classList.add('highlighted-special');
			const text = 'davis9001';
			const randomLetter = text[Math.floor(Math.random() * text.length)];
			const originalText = element.textContent;
			element.textContent = randomLetter;
			setTimeout(() => {
				element.textContent = originalText;
			}, 9001);
		} else {
			element.classList.add('highlighted');
		}
		
		if (extraSpecial) {
			element.classList.remove('highlighted');
			element.classList.remove('highlighted-special');
			element.classList.remove('highlighted-extra-special');
			element.classList.add('highlighted-extra-special');
			const originalText = element.textContent;
			element.textContent = '6';
			setTimeout(() => {
				element.textContent = originalText;
				element.classList.remove('highlighted-extra-special');
			}, 9001);
		}
	});

	const secondaryElements = getElementsWithinDistance(
		mouseX,
		mouseY,
		secondaryDistanceThreshold
	);
	secondaryElements.forEach((element) => {
		element.classList.add('highlighted-secondary');
	});
});
