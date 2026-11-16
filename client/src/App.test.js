import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from './redux/store';
import App from './App';

jest.mock('./pages/Home', () => () => <div>Mock home page</div>);

test('renders the application inside its Redux and router providers', () => {
  const { container } = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    </Provider>
  );
  expect(container.querySelector('.App')).toBeInTheDocument();
});
