import '@testing-library/jest-dom'

// jsdom does not implement scrollIntoView — stub it to avoid errors in tests.
Element.prototype.scrollIntoView = () => {}
