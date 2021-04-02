import * as React from 'react';
import router from 'umi/router';
import styles from './index.less';

export default class extends React.Component {
  constructor(props) {
    super(props);
    if (window.location.pathname.indexOf('/home') < 0) {
      router.replace('/home');
      return;
    }
  }

  render() {
    return (
      <div className={styles.home}>
        home
      </div>
    );
  }
}
