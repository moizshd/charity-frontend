import React, { useState, useEffect, useContext } from 'react';
import Web3 from 'web3';
import { Card, Button, Row, Col, ProgressBar } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import CharityDonation from './CharityDonation.json';
import styles from './App.module.css';
function App() {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [charities, setCharities] = useState([]);
  const [donations, setDonations] = useState([]);


  useEffect(() => {
    loadBlockchainData();
  }, []);

  async function loadBlockchainData() {
    const web3 = new Web3(window.ethereum || 'http://localhost:7545');
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
      } catch (error) {
        console.error("User denied account access");
        return;
      }
    }
    const accounts = await web3.eth.getAccounts();
    if (accounts.length > 0) {
      setAccount(accounts[0]);
      console.log('Account:', accounts[0]);
    } else {
      console.log('No accounts found');
      return;
    }

    setAccount(accounts[0]);
    console.log('Account:', accounts[0]);

    const networkId = await web3.eth.net.getId();
    console.log(networkId);

    const networkData = CharityDonation.networks[networkId];
    console.log('Network data:', networkData);
    if (networkData) {
      const abi = CharityDonation.abi;
      const address = networkData.address;
      const contract = new web3.eth.Contract(abi, address);
      setContract(contract);
      loadCharities(contract);
    } else {
      window.alert('CharityDonation contract not deployed to detected network.');
    }
  }

  async function loadCharities(contract) {
    // Replace with actual charity addresses
    const charityAddresses = ["0x088930c54d8A8355c75E07b1c7c08c251ab66d71",
      "0x3978c3bC79E1483F40352B475e08Aed6916BdBF3"];
    setCharities(charityAddresses);
    console.log('Charities:', charityAddresses);
    const fetchedDonations = await Promise.all(
      charityAddresses.map(async (charity) => {
        const donationsForCharity = await contract.methods
          .getDonations(charity)
          .call();
        return { charity, donations: donationsForCharity };
      })
    );

    setDonations(fetchedDonations);
  }

  async function donate(charity, amount) {
    try {
      const weiAmount = Web3.utils.toWei(amount.toString(), 'ether');

      // Add an event listener for the DonationMade event
      contract.events.DonationMade({}, (error, event) => {
        if (error) {
          console.error("Error in DonationMade event:", error);
        } else {
          console.log("DonationMade event:", event);
        }
      });

      await contract.methods.donate(charity).send({ from: account, value: weiAmount });
    } catch (error) {
      if (error.code === 4100) {
        console.error("User denied the transaction");
        // You can display a message to the user here if needed
      } else {
        console.error("An error occurred during the transaction", error);
      }
    }
  }

  async function withdraw(charity) {
    await contract.methods.withdraw(charity).send({ from: account });
  }
  function getTotalDonated(charityDonations) {
    return charityDonations.donations.reduce((total, donation) => {
      return total + parseFloat(Web3.utils.fromWei(donation.amount, 'ether'));
    }, 0);
  }
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Charity Donation Platform</h1>
      <h2>Account: {account}</h2>
      <h2>Contract: {contract ? contract.options.address : 'Loading...'}</h2>
      <h2>Charities</h2>
      <Row>
        {donations.map((charityDonations, index) => (
          <Col key={index} md={6} className="mb-4">
            <Card className={styles.card}>
              <Card.Header className={styles.cardHeader}>
                {charityDonations.charity}
              </Card.Header>
              <Card.Body className={styles.cardBody}>
                <h5>Donations:</h5>
                <ul>
                  {charityDonations.donations.map((donation, i) => (
                    <li key={i}>
                      Donor: {donation.donor}, Amount: {Web3.utils.fromWei(donation.amount, "ether")} Ether
                    </li>
                  ))}
                </ul>
              </Card.Body>
              <Card.Footer className={styles.cardFooter}>

                <div className={styles.buttons}>
                  <Button onClick={() => donate(charityDonations.charity, 0.1)}>Donate 0.1 Ether</Button>
                  <Button variant="warning" onClick={() => withdraw(charityDonations.charity)}>Withdraw</Button>
                </div>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );

}

export default App;