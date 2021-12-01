use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

/// Define the type of state stored in accounts
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct PriceAccount {
    /// number of greetings
    pub price: u32,
}

// Declare and export the program's entrypoint
entrypoint!(process_instruction);

// Program entrypoint's implementation
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    msg!("Rust program entrypoint !!{:?}!!", _instruction_data);

    // Iterating accounts is safer then indexing
    let accounts_iter = &mut accounts.iter();

    // Get the account to say  to
    let account = next_account_info(accounts_iter)?;

    // The account must be owned by the program in order to modify its data
    if account.owner != program_id {
        msg!("Price account does not have the correct program id");
        return Err(ProgramError::IncorrectProgramId);
    }

    // Increment and store the number of times the account has been greeted
    let mut greeting_account = PriceAccount::try_from_slice(&account.data.borrow())?;
    greeting_account.price = 268;
    greeting_account.serialize(&mut &mut account.data.borrow_mut()[..])?;

    msg!("Price is {}!", greeting_account.price);

    Ok(())
}

// Sanity tests
#[cfg(test)]
mod test {
    use super::*;
    use solana_program::clock::Epoch;
    use std::mem;

    #[test]
    fn test_sanity() {
        let program_id = Pubkey::default();
        let key = Pubkey::default();
        let mut lamports = 0;
        let mut data = vec![0; mem::size_of::<u32>()];
        let owner = Pubkey::default();
        let account = AccountInfo::new(
            &key,
            false,
            true,
            &mut lamports,
            &mut data,
            &owner,
            false,
            Epoch::default(),
        );
        let instruction_data: Vec<u8> = Vec::new();

        let accounts = vec![account];

        assert_eq!(
            PriceAccount::try_from_slice(&accounts[0].data.borrow())
                .unwrap()
                .price,
            0
        );
        process_instruction(&program_id, &accounts, &instruction_data).unwrap();
        assert_eq!(
            PriceAccount::try_from_slice(&accounts[0].data.borrow())
                .unwrap()
                .price,
            1
        );
        process_instruction(&program_id, &accounts, &instruction_data).unwrap();
        assert_eq!(
            PriceAccount::try_from_slice(&accounts[0].data.borrow())
                .unwrap()
                .price,
            2
        );
    }
}
